import uuid
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import Doctor, User
from app.auth.rbac import get_current_user

router = APIRouter(prefix="/doctors", tags=["Doctors"])

class DoctorSchema(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    specialization: str
    qualification: Optional[str] = None
    is_approved: bool
    phone: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[DoctorSchema])
def list_doctors(
    specialization: Optional[str] = None,
    only_approved: bool = True,
    db: Session = Depends(get_db)
):
    # Auto-seed if database is fresh and has no doctors
    if db.query(Doctor).count() == 0:
        try:
            from app.database.init_db import init_db
            init_db()
        except Exception as e:
            print(f"Auto-seed error: {e}")

    query = db.query(Doctor)
    if only_approved:
        query = query.filter(Doctor.is_approved == True)
    if specialization:
        query = query.filter(Doctor.specialization.ilike(f"%{specialization}%"))
    return query.all()

@router.get("/{doctor_id}", response_model=DoctorSchema)
def get_doctor_by_id(doctor_id: uuid.UUID, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    return doctor
