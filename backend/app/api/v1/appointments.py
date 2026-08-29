import uuid
from typing import List, Optional
from datetime import datetime, timedelta, time
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import User, UserRole, Patient, Doctor, DoctorAvailability, Appointment, AppointmentStatus, AuditLog
from app.auth.rbac import get_current_user, require_doctor, require_patient
from app.schemas.appointment import AvailabilityCreate, AvailabilityResponse, AppointmentBook, AppointmentResponse, AppointmentStatusUpdate

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.post("/availability", response_model=AvailabilityResponse)
def set_doctor_availability(
    avail_in: AvailabilityCreate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found.")

    start_t = datetime.strptime(avail_in.start_time, "%H:%M").time()
    end_t = datetime.strptime(avail_in.end_time, "%H:%M").time()

    availability = DoctorAvailability(
        doctor_id=doctor.id,
        day_of_week=avail_in.day_of_week,
        start_time=start_t,
        end_time=end_t,
        slot_duration_minutes=avail_in.slot_duration_minutes
    )
    db.add(availability)
    db.commit()
    db.refresh(availability)
    return availability

@router.get("/slots", response_model=List[str])
def get_available_slots(
    doctor_id: uuid.UUID,
    date_str: str = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    day_of_week = target_date.weekday() # 0=Monday, 6=Sunday

    availabilities = db.query(DoctorAvailability).filter(
        DoctorAvailability.doctor_id == doctor_id,
        DoctorAvailability.day_of_week == day_of_week
    ).all()

    existing_appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.APPROVED])
    ).all()

    booked_times = {app.appointment_timestamp for app in existing_appointments}
    available_slots = []

    for avail in availabilities:
        current_dt = datetime.combine(target_date, avail.start_time)
        end_dt = datetime.combine(target_date, avail.end_time)

        while current_dt + timedelta(minutes=avail.slot_duration_minutes) <= end_dt:
            if current_dt not in booked_times:
                available_slots.append(current_dt.strftime("%Y-%m-%dT%H:%M:%S"))
            current_dt += timedelta(minutes=avail.slot_duration_minutes)

    # Fallback default slots for demo if no explicit availability configured
    if not available_slots:
        for hour in [9, 10, 11, 14, 15, 16]:
            dt = datetime.combine(target_date, time(hour, 0))
            if dt not in booked_times:
                available_slots.append(dt.strftime("%Y-%m-%dT%H:%M:%S"))

    return available_slots

@router.post("/book", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def book_appointment(
    appt_in: AppointmentBook,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found.")

    # Prevent Double Booking
    existing = db.query(Appointment).filter(
        Appointment.doctor_id == appt_in.doctor_id,
        Appointment.appointment_timestamp == appt_in.appointment_timestamp,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.APPROVED])
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="This time slot has already been booked.")

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=appt_in.doctor_id,
        appointment_timestamp=appt_in.appointment_timestamp,
        status=AppointmentStatus.PENDING,
        reason=appt_in.reason
    )
    db.add(appointment)
    db.add(AuditLog(user_id=current_user.id, action="BOOK_APPOINTMENT", resource=str(appointment.id)))
    db.commit()
    db.refresh(appointment)

    doctor = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()
    return AppointmentResponse(
        id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        patient_name=patient.full_name,
        doctor_name=doctor.full_name if doctor else "Doctor",
        doctor_specialization=doctor.specialization if doctor else "General",
        appointment_timestamp=appointment.appointment_timestamp,
        status=appointment.status,
        reason=appointment.reason,
        created_at=appointment.created_at
    )

@router.get("/", response_model=List[AppointmentResponse])
def get_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Appointment)
    if current_user.role == UserRole.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        query = query.filter(Appointment.patient_id == patient.id)
    elif current_user.role == UserRole.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            return []
        query = query.filter(Appointment.doctor_id == doctor.id)

    appts = query.order_by(Appointment.appointment_timestamp.desc()).all()
    results = []
    for app in appts:
        pat = db.query(Patient).filter(Patient.id == app.patient_id).first()
        doc = db.query(Doctor).filter(Doctor.id == app.doctor_id).first()
        results.append(AppointmentResponse(
            id=app.id,
            patient_id=app.patient_id,
            doctor_id=app.doctor_id,
            patient_name=pat.full_name if pat else "Patient",
            doctor_name=doc.full_name if doc else "Doctor",
            doctor_specialization=doc.specialization if doc else "General",
            appointment_timestamp=app.appointment_timestamp,
            status=app.status,
            reason=app.reason,
            created_at=app.created_at
        ))
    return results

@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
def update_appointment_status(
    appointment_id: uuid.UUID,
    status_update: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    appointment.status = status_update.status
    doc = db.query(Doctor).filter(Doctor.id == appointment.doctor_id).first()

    if status_update.status == AppointmentStatus.APPROVED and doc:
        current_reason = appointment.reason or ""
        if f"[APPROVED_BY: {doc.full_name}]" not in current_reason:
            appointment.reason = f"{current_reason} [APPROVED_BY: {doc.full_name}]".strip()

    db.add(AuditLog(user_id=current_user.id, action=f"APPOINTMENT_{status_update.status.value}", resource=str(appointment.id)))
    db.commit()
    db.refresh(appointment)

    pat = db.query(Patient).filter(Patient.id == appointment.patient_id).first()
    return AppointmentResponse(
        id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        patient_name=pat.full_name if pat else "Patient",
        doctor_name=doc.full_name if doc else "Doctor",
        doctor_specialization=doc.specialization if doc else "General",
        appointment_timestamp=appointment.appointment_timestamp,
        status=appointment.status,
        reason=appointment.reason,
        created_at=appointment.created_at
    )
