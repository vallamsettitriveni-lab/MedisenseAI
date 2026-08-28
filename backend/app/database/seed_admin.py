from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.user import User, UserRole
from app.auth.security import get_password_hash

ADMIN_EMAILS = ["admin@medisense.com", "admin@mediinterpret.com"]
ADMIN_PASSWORD = "AdminPass123!"

def seed_admin():
    db: Session = SessionLocal()
    try:
        for email in ADMIN_EMAILS:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                admin_user = User(
                    email=email,
                    password_hash=get_password_hash(ADMIN_PASSWORD),
                    role=UserRole.ADMIN,
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                print(f"Successfully created Super Admin credentials: {email}")
            else:
                # Ensure password hash is valid
                admin_user = existing
                admin_user.password_hash = get_password_hash(ADMIN_PASSWORD)
                admin_user.role = UserRole.ADMIN
                admin_user.is_active = True
                db.commit()
                print(f"Admin account '{email}' refreshed.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
