import uuid
from datetime import date
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import Patient, User, UserRole, AuditLog
from app.auth.rbac import get_current_user, require_doctor

router = APIRouter(prefix="/patients", tags=["Patients"])

class PatientSchema(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    dob: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    reports_count: int = 0
    appointments_count: int = 0

    class Config:
        from_attributes = True

class PatientUpdateSchema(BaseModel):
    full_name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None

@router.get("/", response_model=List[PatientSchema])
def list_patients(
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    patients = db.query(Patient).all()
    results = []
    for p in patients:
        user = db.query(User).filter(User.id == p.user_id).first()
        reports_c = len(p.reports) if p.reports else 0
        appts_c = len(p.appointments) if p.appointments else 0
        results.append(PatientSchema(
            id=p.id,
            user_id=p.user_id,
            full_name=p.full_name,
            dob=p.dob,
            gender=p.gender,
            phone=p.phone,
            email=user.email if user else None,
            reports_count=reports_c,
            appointments_count=appts_c
        ))
    return results

@router.get("/me", response_model=PatientSchema)
def get_my_patient_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
    user = db.query(User).filter(User.id == patient.user_id).first()
    return PatientSchema(
        id=patient.id,
        user_id=patient.user_id,
        full_name=patient.full_name,
        dob=patient.dob,
        gender=patient.gender,
        phone=patient.phone,
        email=user.email if user else None,
        reports_count=len(patient.reports) if patient.reports else 0,
        appointments_count=len(patient.appointments) if patient.appointments else 0
    )

@router.patch("/me", response_model=PatientSchema)
def update_my_patient_profile(
    update_data: PatientUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    if update_data.full_name is not None:
        patient.full_name = update_data.full_name.strip()
    if update_data.dob is not None:
        patient.dob = update_data.dob
    if update_data.gender is not None:
        patient.gender = update_data.gender
    if update_data.phone is not None:
        patient.phone = update_data.phone.strip()

    db.add(AuditLog(user_id=current_user.id, action="UPDATE_PATIENT_PROFILE", resource=str(patient.id)))
    db.commit()
    db.refresh(patient)

    user = db.query(User).filter(User.id == patient.user_id).first()
    return PatientSchema(
        id=patient.id,
        user_id=patient.user_id,
        full_name=patient.full_name,
        dob=patient.dob,
        gender=patient.gender,
        phone=patient.phone,
        email=user.email if user else None,
        reports_count=len(patient.reports) if patient.reports else 0,
        appointments_count=len(patient.appointments) if patient.appointments else 0
    )

@router.get("/{patient_id}", response_model=PatientSchema)
def get_patient_profile(
    patient_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    
    # Ensure patient can only view their own profile unless Doctor or Admin
    if current_user.role == UserRole.PATIENT and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to patient profile.")

    user = db.query(User).filter(User.id == patient.user_id).first()
    return PatientSchema(
        id=patient.id,
        user_id=patient.user_id,
        full_name=patient.full_name,
        dob=patient.dob,
        gender=patient.gender,
        phone=patient.phone,
        email=user.email if user else None,
        reports_count=len(patient.reports) if patient.reports else 0,
        appointments_count=len(patient.appointments) if patient.appointments else 0
    )
