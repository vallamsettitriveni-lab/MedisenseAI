import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.PATIENT
    full_name: str
    phone: Optional[str] = None
    # Doctor specific fields
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    # Patient specific fields
    dob: Optional[str] = None # YYYY-MM-DD
    gender: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResetPassword(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=8)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: uuid.UUID
    email: str
    full_name: Optional[str] = None

class UserProfile(BaseModel):
    id: uuid.UUID
    email: EmailStr
    role: UserRole
    is_active: bool
    full_name: Optional[str] = None
    patient_id: Optional[uuid.UUID] = None
    doctor_id: Optional[uuid.UUID] = None
    is_approved: Optional[bool] = None # for doctors

    class Config:
        from_attributes = True
