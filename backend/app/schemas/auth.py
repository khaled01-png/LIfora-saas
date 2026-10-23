from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from backend.app.schemas.common import validate_blood_group, validate_phone, validate_person_name

# Public sign-up may only create these roles. Admin accounts are created
# server-side with `python -m backend.app.create_admin` (never from the public API).
PUBLIC_ROLES = {"donor", "requester"}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)
    role: Optional[str] = None


class RegisterRequest(BaseModel):
    """Step 1 of sign-up: only name, email and password. Role and profile come after e-mail verification."""
    name: str = Field(..., min_length=2, max_length=128)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        return validate_person_name(v)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^[0-9]{6}$")


class ResendCodeRequest(BaseModel):
    email: EmailStr


class OnboardingRequest(BaseModel):
    """Step 3 of sign-up: choose a role and fill the profile (name/email/password were already given)."""
    role: str
    bloodGroup: str
    age: int = Field(..., ge=16, le=100)
    city: str = Field(..., min_length=2, max_length=64)
    location: str = Field(..., min_length=2, max_length=128)
    radiusKm: float = Field(..., ge=1, le=200)
    phone: str = Field(..., max_length=64)

    @field_validator("role")
    @classmethod
    def check_role(cls, v: str) -> str:
        role = v.strip().lower()
        if role not in PUBLIC_ROLES:
            raise ValueError("Role must be one of: donor, requester")
        return role

    @field_validator("bloodGroup")
    @classmethod
    def check_blood_group(cls, v: str) -> str:
        return validate_blood_group(v)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        return validate_phone(v, required=True)


class ProfileUpdateRequest(BaseModel):
    bloodGroup: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=16, le=100)
    city: Optional[str] = Field(default=None, min_length=2, max_length=64)
    location: Optional[str] = Field(default=None, min_length=2, max_length=128)
    radiusKm: Optional[float] = Field(default=None, ge=1, le=200)
    phone: Optional[str] = Field(default=None, max_length=64)

    @field_validator("bloodGroup")
    @classmethod
    def check_blood_group(cls, v):
        return validate_blood_group(v) if v else v

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v):
        return validate_phone(v, required=True) if v is not None else v


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    bloodGroup: Optional[str] = None
    city: str
    location: Optional[str] = None
    phone: Optional[str] = None
    totalDonations: int = 0
    lastDonation: Optional[str] = None
    availability: str = "Available"


class AuthResponse(BaseModel):
    message: str
    user: dict
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=2000)
    newPassword: str = Field(..., min_length=8, max_length=128)


class SwitchRoleRequest(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def check_role(cls, v: str) -> str:
        role = v.strip().lower()
        if role not in PUBLIC_ROLES:
            raise ValueError("Role must be one of: donor, requester")
        return role
