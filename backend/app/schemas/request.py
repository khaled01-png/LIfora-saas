from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from backend.app.schemas.common import validate_blood_group, validate_phone, validate_person_name, validate_place_name, validate_deadline

VALID_REQUEST_STATUSES = {"Pending", "In Progress", "Fulfilled", "Cancelled", "Expired", "Active"}

class BloodRequestCreate(BaseModel):
    patientName: str = Field(..., min_length=2, max_length=128)
    bloodGroup: str
    unitsNeeded: int = Field(default=1, ge=1, le=10)
    hospitalName: str = Field(..., min_length=2, max_length=128)
    city: Optional[str] = Field(default="Sylhet", max_length=64)
    urgency: Optional[str] = "Urgent"  # Critical, Urgent, Normal
    deadline: Optional[str] = Field(default="Within 24 hours", max_length=64)
    reason: Optional[str] = Field(default="Emergency transfusion required", max_length=500)
    contactPerson: Optional[str] = Field(default="Family Guardian", max_length=128)
    contactPhone: str = Field(..., min_length=6, max_length=64)

    @field_validator("patientName", "contactPerson")
    @classmethod
    def check_names(cls, v):
        return validate_person_name(v) if v else v

    @field_validator("hospitalName")
    @classmethod
    def check_hospital(cls, v: str) -> str:
        return validate_place_name(v)

    @field_validator("deadline")
    @classmethod
    def check_deadline(cls, v):
        return validate_deadline(v) if v else "Within 24 hours"

    @field_validator("contactPhone")
    @classmethod
    def check_contact_phone(cls, v: str) -> str:
        return validate_phone(v, required=True)

    @field_validator("bloodGroup")
    @classmethod
    def check_blood_group(cls, v: str) -> str:
        return validate_blood_group(v)

    @field_validator("urgency")
    @classmethod
    def check_urgency(cls, v: Optional[str]) -> str:
        if not v:
            return "Urgent"
        cleaned = v.strip().capitalize()
        if cleaned not in {"Critical", "Urgent", "Normal"}:
            return "Urgent"
        return cleaned

class BloodRequestStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def check_status(cls, v: str) -> str:
        cleaned = v.strip()
        if cleaned not in VALID_REQUEST_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(sorted(VALID_REQUEST_STATUSES))}")
        return cleaned

class BloodRequestListResponse(BaseModel):
    requests: List[dict]
    count: int
