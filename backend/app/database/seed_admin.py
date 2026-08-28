from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.user import User, UserRole
from app.auth.security import get_password_hash

ADMIN_EMAIL = "admin@mediinterpret.com"
ADMIN_PASSWORD = "AdminPass123!"

def seed_admin():
    db: Session = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not existing:
            admin_user = User(
                email=ADMIN_EMAIL,
                password_hash=get_password_hash(ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print(f"Successfully created Super Admin credentials: {ADMIN_EMAIL}")
        else:
            print(f"Admin account '{ADMIN_EMAIL}' already exists.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
