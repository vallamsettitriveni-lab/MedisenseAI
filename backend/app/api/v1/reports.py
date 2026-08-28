import os
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.config import settings
from app.models import User, UserRole, Patient, Report, ReportStatus, LabResult, AIExplanation, AuditLog
from app.auth.rbac import get_current_user, require_patient
from app.ai.ocr.parser import PDFParser
from app.ai.extraction.extractor import LabExtractor
from app.ai.llm.provider import LLMService
from app.ai.rag.pipeline import RAGPipeline
from app.ai.safety.filter import SafetyFilter
from app.schemas.report import ReportResponse, ReportComparisonResponse, ReportComparisonItem, TrendSeriesResponse, TrendDataPoint

router = APIRouter(prefix="/reports", tags=["Medical Reports"])

extractor = LabExtractor()
rag_pipeline = RAGPipeline()
llm_service = LLMService()

@router.post("/upload", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def upload_report(
    file: UploadFile = File(...),
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    # 1. Fetch Patient Record
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    # 2. Save File locally (or to Supabase)
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # 3. Create Report DB Entry
    report = Report(
        patient_id=patient.id,
        file_name=file.filename,
        file_url=file_path,
        processing_status=ReportStatus.PROCESSING,
        report_date=datetime.utcnow()
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    try:
        # 4. Extract Text via PyMuPDF / OCR
        extracted_text = PDFParser.extract_text_from_pdf(contents)

        # 5. Extract Structured Lab Values & Determine LOW/NORMAL/HIGH
        parsed_results = extractor.parse_extracted_text(extracted_text)

        lab_result_entities = []
        abnormal_tests = []

        for item in parsed_results:
            lab_res = LabResult(
                report_id=report.id,
                patient_id=patient.id,
                test_name=item["test_name"],
                value=item["value"],
                unit=item["unit"],
                reference_min=item["reference_min"],
                reference_max=item["reference_max"],
                status=item["status"]
            )
            db.add(lab_res)
            lab_result_entities.append(lab_res)
            if item["status"] in ["LOW", "HIGH"]:
                abnormal_tests.append(f"{item['test_name']} ({item['value']} {item['unit']} - {item['status']})")

        # 6. RAG Context Retrieval & LLM Explanation
        rag_query = f"Lab test results for patient: {', '.join(abnormal_tests)}" if abnormal_tests else "Normal blood count panel interpretation"
        rag_context = rag_pipeline.retrieve_context(rag_query, db)

        prompt = f"""
You are an educational medical report assistant.
Lab Findings: {', '.join(abnormal_tests) if abnormal_tests else 'All values within normal reference range'}
Medical Context: {rag_context}

Provide a patient-friendly summary:
1. Explain what these lab tests measure generally.
2. Provide general lifestyle and nutrition suggestions.
3. Suggest 3 neutral questions the patient can ask their doctor.
DO NOT diagnose diseases or prescribe medication.
"""
        raw_explanation = llm_service.generate(prompt)
        safe_explanation = SafetyFilter.sanitize_explanation(raw_explanation)

        ai_exp = AIExplanation(
            report_id=report.id,
            structured_summary={"findings": abnormal_tests, "context": rag_context},
            lifestyle_suggestions="• Maintain balanced hydration.\n• Ensure regular daily sleep and moderate physical activity.\n• Discuss dietary considerations with your healthcare professional.",
            precautions=safe_explanation
        )
        db.add(ai_exp)

        report.processing_status = ReportStatus.COMPLETED
        db.add(AuditLog(user_id=current_user.id, action="REPORT_UPLOAD", resource=str(report.id)))
        db.commit()
        db.refresh(report)

    except Exception as e:
        report.processing_status = ReportStatus.FAILED
        db.commit()
        print(f"Error processing report: {e}")

    return report

@router.get("/", response_model=List[ReportResponse])
def get_patient_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        return db.query(Report).filter(Report.patient_id == patient.id).order_by(Report.uploaded_at.desc()).all()
    elif current_user.role in [UserRole.DOCTOR, UserRole.ADMIN]:
        return db.query(Report).order_by(Report.uploaded_at.desc()).all()

@router.get("/{report_id}", response_model=ReportResponse)
def get_report_by_id(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report

@router.delete("/{report_id}", status_code=status.HTTP_200_OK)
def delete_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or report.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Unauthorized to delete this report.")

    if report.file_url and os.path.exists(report.file_url):
        try:
            os.remove(report.file_url)
        except Exception:
            pass

    db.delete(report)
    db.add(AuditLog(user_id=current_user.id, action="DELETE_REPORT", resource=str(report_id)))
    db.commit()

    return {"message": "Report deleted successfully.", "deleted_id": str(report_id)}

@router.get("/compare/items", response_model=ReportComparisonResponse)
def compare_reports(
    new_report_id: uuid.UUID,
    old_report_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_report = db.query(Report).filter(Report.id == new_report_id).first()
    if not new_report:
        raise HTTPException(status_code=404, detail="New report not found.")

    if not old_report_id:
        # Find the previous report for the same patient
        prev_report = db.query(Report).filter(
            Report.patient_id == new_report.patient_id,
            Report.id != new_report_id,
            Report.uploaded_at < new_report.uploaded_at
        ).order_by(Report.uploaded_at.desc()).first()
        if prev_report:
            old_report_id = prev_report.id

    old_lab_dict = {}
    if old_report_id:
        old_labs = db.query(LabResult).filter(LabResult.report_id == old_report_id).all()
        for lab in old_labs:
            old_lab_dict[lab.test_name.lower()] = lab

    new_labs = db.query(LabResult).filter(LabResult.report_id == new_report_id).all()
    comparison_items = []

    for curr in new_labs:
        prev = old_lab_dict.get(curr.test_name.lower())
        prev_val = prev.value if prev else None
        prev_status = prev.status if prev else None

        abs_change = round(curr.value - prev_val, 2) if prev_val is not None else None
        pct_change = round(((curr.value - prev_val) / prev_val) * 100, 1) if prev_val is not None and prev_val != 0 else None

        direction = "NO_CHANGE"
        if abs_change is not None:
            if abs_change > 0:
                direction = "INCREASED"
            elif abs_change < 0:
                direction = "DECREASED"

        comparison_items.append(ReportComparisonItem(
            test_name=curr.test_name,
            unit=curr.unit,
            previous_value=prev_val,
            current_value=curr.value,
            absolute_change=abs_change,
            percentage_change=pct_change,
            direction=direction,
            previous_status=prev_status,
            current_status=curr.status
        ))

    return ReportComparisonResponse(
        old_report_id=old_report_id,
        new_report_id=new_report_id,
        comparisons=comparison_items
    )

@router.get("/trends/chart", response_model=TrendSeriesResponse)
def get_lab_trends(
    test_name: str,
    patient_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_patient_id = patient_id
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            target_patient_id = patient.id

    if not target_patient_id:
        raise HTTPException(status_code=400, detail="Patient ID required.")

    results = db.query(LabResult, Report).join(Report, LabResult.report_id == Report.id).filter(
        LabResult.patient_id == target_patient_id,
        LabResult.test_name.ilike(test_name)
    ).order_by(Report.uploaded_at.asc()).all()

    data_points = []
    unit = None
    for lab, rep in results:
        unit = lab.unit
        data_points.append(TrendDataPoint(
            date=rep.uploaded_at.strftime("%b %d, %Y"),
            value=lab.value,
            status=lab.status,
            reference_min=lab.reference_min,
            reference_max=lab.reference_max
        ))

    return TrendSeriesResponse(
        test_name=test_name,
        unit=unit,
        data_points=data_points
    )

@router.post("/sample", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_sample_report(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    report = Report(
        patient_id=patient.id,
        file_name="Comprehensive_Metabolic_Panel_Sample.pdf",
        file_url="/sample/Comprehensive_Metabolic_Panel_Sample.pdf",
        processing_status=ReportStatus.COMPLETED,
        report_date=datetime.utcnow()
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    sample_items = [
        {"test_name": "Hemoglobin", "value": 14.2, "unit": "g/dL", "min": 13.0, "max": 17.0, "status": "NORMAL"},
        {"test_name": "Glucose", "value": 104.0, "unit": "mg/dL", "min": 70.0, "max": 99.0, "status": "HIGH"},
        {"test_name": "Cholesterol", "value": 215.0, "unit": "mg/dL", "min": 125.0, "max": 200.0, "status": "HIGH"},
        {"test_name": "Vitamin D", "value": 24.5, "unit": "ng/mL", "min": 30.0, "max": 100.0, "status": "LOW"},
        {"test_name": "WBC", "value": 6.8, "unit": "x10^3/uL", "min": 4.5, "max": 11.0, "status": "NORMAL"},
        {"test_name": "Platelets", "value": 260.0, "unit": "x10^3/uL", "min": 150.0, "max": 450.0, "status": "NORMAL"},
        {"test_name": "TSH", "value": 2.1, "unit": "mIU/L", "min": 0.4, "max": 4.0, "status": "NORMAL"}
    ]

    for item in sample_items:
        db.add(LabResult(
            report_id=report.id,
            patient_id=patient.id,
            test_name=item["test_name"],
            value=item["value"],
            unit=item["unit"],
            reference_min=item["min"],
            reference_max=item["max"],
            status=item["status"]
        ))

    explanation = AIExplanation(
        report_id=report.id,
        patient_id=patient.id,
        summary="Your sample Comprehensive Metabolic & Lipid Panel shows mostly healthy baseline indicators with mild elevations in Fasting Glucose (104 mg/dL) and Total Cholesterol (215 mg/dL), alongside slightly reduced Vitamin D (24.5 ng/mL).",
        potential_causes="• Mildly elevated fasting glucose can be associated with dietary carbohydrate intake or early prediabetes.\n• Borderline cholesterol suggests review of dietary saturated fats.\n• Lower Vitamin D is common with limited sunlight exposure.",
        dietary_guidance="• Incorporate soluble fiber (oats, legumes, flaxseeds) to support healthy cholesterol metabolism.\n• Prioritize complex whole grains, leafy greens, and lean protein.\n• Discuss Vitamin D3 supplementation (1000-2000 IU) with your healthcare provider.",
        questions_for_doctor="• Should I consider a follow-up HbA1c test to evaluate average 3-month blood sugar control?\n• Would you recommend a lipid fraction breakdown (LDL/HDL/Triglycerides)?\n• What is the optimal daily Vitamin D3 dosage for my profile?",
        disclaimer="MediSense AI provides educational explanations only and does NOT provide formal medical diagnoses or prescriptions. Always consult a qualified licensed physician for medical advice."
    )
    db.add(explanation)
    db.commit()
    db.refresh(report)
    return report
