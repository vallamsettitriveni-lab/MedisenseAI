from sqlalchemy import text
from app.database.session import engine, Base
from app.config import settings
from app.models import User, UserRole, Patient, Doctor, DoctorAvailability, Report, LabResult, AIExplanation, Appointment, KnowledgeDocument, KnowledgeChunk, AuditLog

def init_db():
    if not settings.DATABASE_URL.startswith("sqlite"):
        with engine.connect() as conn:
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
            except Exception as e:
                print(f"Warning: Could not enable vector extension automatically: {e}")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")

    # Automatically seed admin user & doctors
    from app.database.seed_admin import seed_admin
    from app.database.seed_doctors import seed_doctors

    seed_admin()
    seed_doctors()

if __name__ == "__main__":
    init_db()
