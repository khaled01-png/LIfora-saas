from typing import Optional
from pydantic import BaseModel, Field

class InventoryUpdate(BaseModel):
    availableUnits: Optional[int] = Field(default=None, ge=0)
    reservedUnits: Optional[int] = Field(default=None, ge=0)
    status: Optional[str] = None

class InventoryAdjust(BaseModel):
    delta: int = Field(..., ge=-100, le=100)
