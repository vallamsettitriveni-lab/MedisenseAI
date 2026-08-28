from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.database.session import get_db
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.audit_log import AuditLog
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserProfile
from app.auth.security import get_password_hash, verify_password, create_access_token
from app.auth.rbac import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

SUPER_ADMIN_EMAIL = "admin@mediinterpret.com"

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # 1. Prevent self-registration as ADMIN
    if user_in.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration for ADMIN role is prohibited. Only the system owner has Admin access."
        )

    # 2. Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    # 3. Create User account
    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role
    )
    db.add(user)
    db.flush()

    # 4. Create Role-Specific Profile
    if user_in.role == UserRole.PATIENT:
        dob_date = None
        if user_in.dob:
            try:
                dob_date = datetime.strptime(user_in.dob, "%Y-%m-%d").date()
            except ValueError:
                pass
        patient = Patient(
            user_id=user.id,
            full_name=user_in.full_name,
            dob=dob_date,
            gender=user_in.gender,
            phone=user_in.phone
        )
        db.add(patient)

    elif user_in.role == UserRole.DOCTOR:
        doctor = Doctor(
            user_id=user.id,
            full_name=user_in.full_name,
            specialization=user_in.specialization or "General Physician",
            qualification=user_in.qualification or "MBBS",
            phone=user_in.phone,
            is_approved=False # Requires admin approval
        )
        db.add(doctor)

    # 5. Audit Log
    log = AuditLog(
        user_id=user.id,
        action="USER_REGISTER",
        resource=str(user.id)
    )
    db.add(log)

    db.commit()
    db.refresh(user)

    # 6. Issue Token
    access_token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(
        access_token=access_token,
        role=user.role,
        user_id=user.id,
        email=user.email,
        full_name=user_in.full_name
    )

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled."
        )

    # Enforce strictly that ONLY admin@mediinterpret.com can log in as ADMIN
    if user.role == UserRole.ADMIN and user.email != SUPER_ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized admin account. Only system owner admin email is permitted."
        )

    # Retrieve profile full name
    full_name = None
    if user.role == UserRole.PATIENT and user.patient_profile:
        full_name = user.patient_profile.full_name
    elif user.role == UserRole.DOCTOR and user.doctor_profile:
        full_name = user.doctor_profile.full_name
    elif user.role == UserRole.ADMIN:
        full_name = "System Administrator"

    log = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        resource=str(user.id)
    )
    db.add(log)
    db.commit()

    access_token = create_access_token(subject=user.id, role=user.role.value)
    return TokenResponse(
        access_token=access_token,
        role=user.role,
        user_id=user.id,
        email=user.email,
        full_name=full_name
    )

@router.get("/me", response_model=UserProfile)
def get_current_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient_id = None
    doctor_id = None
    full_name = None
    is_approved = None

    if current_user.role == UserRole.PATIENT and current_user.patient_profile:
        patient_id = current_user.patient_profile.id
        full_name = current_user.patient_profile.full_name
    elif current_user.role == UserRole.DOCTOR and current_user.doctor_profile:
        doctor_id = current_user.doctor_profile.id
        full_name = current_user.doctor_profile.full_name
        is_approved = current_user.doctor_profile.is_approved
    elif current_user.role == UserRole.ADMIN:
        full_name = "System Administrator"
        is_approved = True

    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        full_name=full_name,
        patient_id=patient_id,
        doctor_id=doctor_id,
        is_approved=is_approved
    )
