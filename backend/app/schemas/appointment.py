import uuid
from datetime import datetime, time
from typing import List, Optional
from pydantic import BaseModel
from app.models.appointment import AppointmentStatus

class AvailabilityCreate(BaseModel):
    day_of_week: int # 0=Monday, 6=Sunday
    start_time: str # "09:00"
    end_time: str # "17:00"
    slot_duration_minutes: int = 30

class AvailabilityResponse(BaseModel):
    id: uuid.UUID
    doctor_id: uuid.UUID
    day_of_week: int
    start_time: time
    end_time: time
    slot_duration_minutes: int

    class Config:
        from_attributes = True

class AppointmentBook(BaseModel):
    doctor_id: uuid.UUID
    appointment_timestamp: datetime
    reason: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    appointment_timestamp: datetime
    status: AppointmentStatus
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus
