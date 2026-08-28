from sqlalchemy import text
from app.database.session import engine, Base, SessionLocal
from app.config import settings
from app.models import User, UserRole, Patient, Doctor, DoctorAvailability, Report, LabResult, AIExplanation, Appointment, KnowledgeDocument, KnowledgeChunk, AuditLog
from app.database.seed_admin import seed_admin
from app.database.seed_doctors import seed_doctors

def init_db():
    print("Starting database schema initialization...")
    # 1. Enable pgvector extension if PostgreSQL
    if not settings.DATABASE_URL.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.commit()
                print("pgvector extension verified.")
        except Exception as e:
            print(f"pgvector extension note (non-critical): {e}")

    # 2. Create all tables
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully.")
    except Exception as e:
        print(f"Error creating database tables: {e}")

    # 3. Seed Super Admin
    try:
        seed_admin()
    except Exception as e:
        print(f"Error in seed_admin: {e}")

    # 4. Seed Doctors & Availability
    try:
        seed_doctors()
    except Exception as e:
        print(f"Error in seed_doctors: {e}")

if __name__ == "__main__":
    init_db()
