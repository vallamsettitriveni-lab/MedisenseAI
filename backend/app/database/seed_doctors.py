import uuid
from datetime import time
from sqlalchemy.orm import Session
from app.database.session import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.doctor import Doctor, DoctorAvailability
from app.auth.security import get_password_hash

DOCTORS_DATA = [
    {"name": "Dr. Sarah Jenkins", "specialization": "Cardiology", "qualification": "MD, FACC"},
    {"name": "Dr. Robert Chen", "specialization": "Hematology", "qualification": "MD, PhD"},
    {"name": "Dr. Emily Rodriguez", "specialization": "Endocrinology", "qualification": "MD"},
    {"name": "Dr. Michael Patel", "specialization": "Internal Medicine", "qualification": "MBBS, MD"},
    {"name": "Dr. Amanda Taylor", "specialization": "Pediatrics", "qualification": "MD, FAAP"},
    {"name": "Dr. David Kim", "specialization": "Neurology", "qualification": "MD, DM"},
    {"name": "Dr. Jessica Thompson", "specialization": "Gastroenterology", "qualification": "MD, FACG"},
    {"name": "Dr. James Wilson", "specialization": "Oncology", "qualification": "MD, FASCO"},
    {"name": "Dr. Olivia Martinez", "specialization": "Nephrology", "qualification": "MD, FASN"},
    {"name": "Dr. Daniel White", "specialization": "Pulmonology", "qualification": "MD, FCCP"},
    {"name": "Dr. Sophia Anderson", "specialization": "Orthopedics", "qualification": "MS (Orthopedics)"},
    {"name": "Dr. William Thomas", "specialization": "General Surgery", "qualification": "MS, FRCS"},
    {"name": "Dr. Elizabeth Jackson", "specialization": "Dermatology", "qualification": "MD, FAAD"},
    {"name": "Dr. Christopher Harris", "specialization": "Psychiatry", "qualification": "MD, FAPA"},
    {"name": "Dr. Victoria Martin", "specialization": "Rheumatology", "qualification": "MD, FACR"},
    {"name": "Dr. Andrew Clark", "specialization": "Urology", "qualification": "MS, MCh"},
    {"name": "Dr. Rachel Lewis", "specialization": "Otolaryngology (ENT)", "qualification": "MS (ENT)"},
    {"name": "Dr. Matthew Robinson", "specialization": "Ophthalmology", "qualification": "MD, FRCOphth"},
    {"name": "Dr. Hannah Walker", "specialization": "Obstetrics & Gynecology", "qualification": "MD, FACOG"},
    {"name": "Dr. Benjamin Young", "specialization": "Pathology", "qualification": "MD, FCAP"}
]

def seed_doctors():
    db: Session = SessionLocal()
    try:
        created_count = 0
        for idx, doc_info in enumerate(DOCTORS_DATA):
            email = f"doctor_{idx+1}@mediinterpret.com"
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                continue

            user = User(
                email=email,
                password_hash=get_password_hash("DoctorPassword123!"),
                role=UserRole.DOCTOR,
                is_active=True
            )
            db.add(user)
            db.flush()

            doctor = Doctor(
                user_id=user.id,
                full_name=doc_info["name"],
                specialization=doc_info["specialization"],
                qualification=doc_info["qualification"],
                is_approved=True,
                phone=f"+1 (555) 01{idx+10:02d}"
            )
            db.add(doctor)
            db.flush()

            # Add availability slots Monday (0) through Friday (4)
            for day in range(5):
                avail = DoctorAvailability(
                    doctor_id=doctor.id,
                    day_of_week=day,
                    start_time=time(9, 0),
                    end_time=time(17, 0),
                    slot_duration_minutes=30
                )
                db.add(avail)
            
            created_count += 1

        db.commit()
        print(f"Successfully seeded {created_count} doctors into database.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding doctors: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_doctors()
