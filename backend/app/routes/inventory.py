from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from urllib.parse import unquote

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.auth.dependencies import require_admin, get_current_user, get_member
from backend.app.models.inventory import InventoryItem
from backend.app.models.donation import DonationRecord
from backend.app.schemas.inventory import InventoryUpdate, InventoryAdjust
from backend.app.schemas.common import validate_blood_group

router = APIRouter(prefix="/inventory", tags=["Blood Inventory"])

ORDER = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

@router.get("")
def get_inventory(db: Session = Depends(get_db), current_user: User = Depends(get_member)):
    items = db.query(InventoryItem).all()
    # Sort according to standard LIFORA order
    item_map = {i.blood_group: i for i in items}
    sorted_items = []
    for bg in ORDER:
        if bg in item_map:
            sorted_items.append(item_map[bg].to_dict())
        else:
            sorted_items.append({
                "bloodGroup": bg,
                "availableUnits": 0,
                "reservedUnits": 0,
                "status": "Available",
                "lastUpdated": "Just now"
            })
    return {"inventory": sorted_items}

@router.put("/{blood_group}")
def update_inventory(blood_group: str, data: InventoryUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    clean_group = validate_blood_group(unquote(blood_group))
    item = db.query(InventoryItem).filter(InventoryItem.blood_group == clean_group).first()
    if not item:
        item = InventoryItem(
            blood_group=clean_group,
            available_units=0,
            reserved_units=0,
            status="Available",
            last_updated="Just now"
        )
        db.add(item)

    if data.availableUnits is not None:
        item.available_units = data.availableUnits
    if data.reservedUnits is not None:
        item.reserved_units = data.reservedUnits
    if data.status:
        item.status = data.status
    item.last_updated = "Just now"

    db.commit()
    db.refresh(item)

    return {
        "message": f"Inventory updated for {clean_group}",
        "item": item.to_dict()
    }

@router.post("/{blood_group}/adjust")
def adjust_inventory(blood_group: str, data: InventoryAdjust, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    clean_group = validate_blood_group(unquote(blood_group))
    item = db.query(InventoryItem).filter(InventoryItem.blood_group == clean_group).first()
    if not item:
        item = InventoryItem(
            blood_group=clean_group,
            available_units=0,
            reserved_units=0,
            status="Available",
            last_updated="Just now"
        )
        db.add(item)

    item.available_units = max(0, item.available_units + data.delta)
    if item.available_units <= 0 or item.available_units < 10:
        item.status = "Critical"
    elif item.available_units < 20:
        item.status = "High Demand"
    else:
        item.status = "Available"
    item.last_updated = "Just now"

    db.commit()
    db.refresh(item)

    return {
        "message": f"Adjusted units for {clean_group} by {data.delta}",
        "item": item.to_dict()
    }

@router.get("/donations")
def get_donations(
    db: Session = Depends(get_db),
    optional_user: User = Depends(get_member)
):
    records = db.query(DonationRecord).order_by(DonationRecord.created_at.desc()).limit(20).all()
    items = [r.to_dict() for r in records]
    if not (optional_user and optional_user.role == "admin"):
        # Public view: first name + last initial only, and no internal donor/request ids.
        for item in items:
            parts = (item.get("donorName") or "Donor").split()
            item["donorName"] = parts[0] + (f" {parts[-1][0]}." if len(parts) > 1 else "")
            item["donorId"] = None
            item["requestId"] = None
    return {"donations": items}
