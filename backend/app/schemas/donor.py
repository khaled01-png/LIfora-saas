from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from backend.app.schemas.common import validate_blood_group, validate_phone, validate_person_name

class DonorCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    bloodGroup: str
    location: Optional[str] = "Sylhet"
    city: Optional[str] = "Sylhet"
    distanceKm: Optional[float] = 2.5
    availability: Optional[str] = "Available"
    matchPercentage: Optional[int] = 95
    lastDonationDate: Optional[str] = "Never"
    totalDonations: Optional[int] = 0
    phone: Optional[str] = None
    email: Optional[str] = "donor@lifora.org"
    bio: Optional[str] = "Voluntary blood donor registered via LIFORA."

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        return validate_person_name(v)

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: Optional[str]) -> str:
        return validate_phone(v, required=True)

    @field_validator("bloodGroup")
    @classmethod
    def check_blood_group(cls, v: str) -> str:
        return validate_blood_group(v)

class DonorAvailabilityUpdate(BaseModel):
    availability: str = Field(...)

    @field_validator("availability")
    @classmethod
    def check_availability(cls, v: str) -> str:
        cleaned = v.strip()
        allowed = {"Available", "Unavailable", "Recently Donated", "On Standby"}
        if cleaned not in allowed:
            raise ValueError(f"Availability must be one of: {', '.join(allowed)}")
        return cleaned

class DonorListResponse(BaseModel):
    donors: List[dict]
    count: int
