import uuid
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import Doctor, User, UserRole, KnowledgeDocument, KnowledgeChunk, AuditLog, Appointment, AppointmentStatus
from app.auth.rbac import require_admin, require_doctor, get_current_user
from app.ai.rag.pipeline import RAGPipeline

router = APIRouter(prefix="/admin", tags=["Admin Management"])
rag_pipeline = RAGPipeline()

class DoctorApprovalRequest(BaseModel):
    is_approved: bool

class DoctorAssignRequest(BaseModel):
    doctor_id: uuid.UUID
    status: Optional[str] = "APPROVED"

class AuditLogSchema(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    action: str
    resource: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

@router.patch("/doctors/{doctor_id}/approve")
def toggle_doctor_approval(
    doctor_id: uuid.UUID,
    req: DoctorApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    doctor.is_approved = req.is_approved
    action_str = "DOCTOR_APPROVED" if req.is_approved else "DOCTOR_DISABLED"
    db.add(AuditLog(user_id=current_user.id, action=action_str, resource=str(doctor.id)))
    db.commit()

    return {"message": f"Doctor account set to approved={req.is_approved}."}

@router.patch("/appointments/{appointment_id}/assign-doctor")
def assign_doctor_to_appointment(
    appointment_id: uuid.UUID,
    req: DoctorAssignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if appointment.status == AppointmentStatus.APPROVED:
        raise HTTPException(status_code=400, detail="This emergency appointment has already been approved and finalized. No further changes can be made.")

    doctor = db.query(Doctor).filter(Doctor.id == req.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    appointment.doctor_id = req.doctor_id
    appointment.status = AppointmentStatus.PENDING # Awaiting assigned doctor approval

    # Append admin assignment info to reason cleanly
    current_reason = appointment.reason or ""
    # Remove previous admin assignment tag if reassigning
    import re
    cleaned_reason = re.sub(r"\[ADMIN_ASSIGNED:[^\]]+\]", "", current_reason).strip()
    appointment.reason = f"{cleaned_reason} [ADMIN_ASSIGNED: Dr. {doctor.full_name}]".strip()

    db.add(AuditLog(user_id=current_user.id, action="ADMIN_ASSIGN_DOCTOR", resource=f"Appt:{appointment.id}->Doc:{doctor.id}"))
    db.commit()
    db.refresh(appointment)

    return {"message": f"Assigned doctor {doctor.full_name} to appointment successfully.", "status": appointment.status, "reason": appointment.reason}

@router.post("/knowledge/upload", status_code=status.HTTP_201_CREATED)
async def upload_knowledge_document(
    title: str,
    source: str = "Clinical Guidelines",
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contents = (await file.read()).decode("utf-8", errors="ignore")

    doc = KnowledgeDocument(
        title=title,
        source=source,
        version="1.0"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Chunk text into ~500 character blocks
    chunks = [contents[i:i+500] for i in range(0, len(contents), 450)]

    for chunk_text in chunks:
        vector = rag_pipeline.get_embedding(chunk_text)
        kc = KnowledgeChunk(
            document_id=doc.id,
            content=chunk_text,
            embedding=vector
        )
        db.add(kc)

    db.add(AuditLog(user_id=current_user.id, action="INGEST_KNOWLEDGE_DOC", resource=str(doc.id)))
    db.commit()

    return {"message": f"Ingested document '{title}' into pgvector knowledge base with {len(chunks)} chunks."}

@router.get("/audit-logs", response_model=List[AuditLogSchema])
def get_audit_logs(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()

@router.post("/seed")
def seed_database_endpoint(db: Session = Depends(get_db)):
    from app.database.init_db import init_db
    init_db()
    return {"message": "Database initialized and seeded with 20 specialist doctors and admin credentials successfully!"}
