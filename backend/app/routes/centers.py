import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.center import BloodCenter
from backend.app.models.user import User
from backend.app.auth.dependencies import require_admin, get_current_user, get_member
from backend.app.schemas.common import validate_blood_group
from backend.app.utils.ids import new_id

router = APIRouter(prefix="/centers", tags=["Blood Centers"])


class CenterIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    category: str = Field(default="Hospital Blood Bank", max_length=64)
    address: str = Field(..., min_length=2, max_length=255)
    city: str = Field(default="Sylhet", max_length=64)
    location: Optional[str] = Field(default=None, max_length=128)
    phone: str = Field(..., min_length=3, max_length=64)
    emergencyPhone: Optional[str] = Field(default=None, max_length=64)
    email: Optional[str] = Field(default=None, max_length=255)
    openHours: str = Field(default="Call to confirm", max_length=128)
    emergency24x7: bool = False
    availableUnits: int = Field(default=0, ge=0, le=100000)
    bloodGroupsAvailable: List[str] = []
    services: List[str] = []
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)


def apply_center(center: BloodCenter, data: CenterIn) -> BloodCenter:
    center.name = data.name.strip()
    center.category = data.category.strip()
    center.address = data.address.strip()
    center.city = data.city.strip()
    center.location = (data.location or data.city).strip()
    center.phone = data.phone.strip()
    center.emergency_phone = (data.emergencyPhone or data.phone).strip()
    center.email = (data.email or "").strip()
    center.open_hours = data.openHours.strip()
    center.emergency_24x7 = data.emergency24x7
    center.available_units = data.availableUnits
    center.blood_groups_available = json.dumps([validate_blood_group(g) for g in data.bloodGroupsAvailable])
    center.services = json.dumps([s.strip() for s in data.services])
    if data.lat is not None:
        center.coordinates_lat = data.lat
    if data.lng is not None:
        center.coordinates_lng = data.lng
    # No invented numbers for admin-created centers (no fake rating, reviews or distance).
    center.rating = 0.0
    center.total_reviews = 0
    center.distance_km = center.distance_km or 0.0
    return center


@router.get("")
def get_centers(
    city: Optional[str] = None,
    emergency: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_member)
):
    query = db.query(BloodCenter)

    if city and city.lower() != "all":
        query = query.filter(BloodCenter.city.ilike(f"%{city.strip()}%"))

    if emergency:
        query = query.filter(BloodCenter.emergency_24x7 == True)  # noqa: E712

    query = query.order_by(BloodCenter.distance_km.asc())
    results = query.all()

    return {
        "centers": [c.to_dict() for c in results],
        "count": len(results)
    }


@router.get("/{id}")
def get_center_by_id(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_member)):
    center = db.query(BloodCenter).filter(BloodCenter.id == id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Blood Center not found")
    return {"center": center.to_dict()}


# ---- administrator-only management (so only real, checked centers are ever shown) ----
@router.post("", status_code=status.HTTP_201_CREATED)
def create_center(data: CenterIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    center = apply_center(BloodCenter(id=new_id("center")), data)
    db.add(center)
    db.commit()
    db.refresh(center)
    return {"message": "Center created", "center": center.to_dict()}


@router.put("/{id}")
def update_center(id: str, data: CenterIn, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    center = db.query(BloodCenter).filter(BloodCenter.id == id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Blood Center not found")
    apply_center(center, data)
    db.commit()
    db.refresh(center)
    return {"message": "Center updated", "center": center.to_dict()}


@router.delete("/{id}")
def delete_center(id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    center = db.query(BloodCenter).filter(BloodCenter.id == id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Blood Center not found")
    db.delete(center)
    db.commit()
    return {"message": "Center deleted"}
