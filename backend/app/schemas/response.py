from typing import Optional
from pydantic import BaseModel, Field

class RespondRequest(BaseModel):
    donorId: Optional[str] = None
    message: Optional[str] = None

class BookDonorRequest(BaseModel):
    responseId: str = Field(..., min_length=1)

class ConfirmDonationRequest(BaseModel):
    donorId: Optional[str] = None
    responseId: Optional[str] = None
    units: Optional[int] = Field(default=1, ge=1, le=10)
