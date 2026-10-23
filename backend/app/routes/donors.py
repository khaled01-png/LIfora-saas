import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.models.donor import Donor
from backend.app.models.donation import DonationRecord
from backend.app.models.user import User
from backend.app.schemas.donor import DonorCreate, DonorAvailabilityUpdate
from backend.app.models.notification import AppNotification
from backend.app.auth.dependencies import get_current_user, get_optional_user, require_admin, get_member, require_roles
from backend.app.utils.ids import new_id
from backend.app.utils.rate_limiter import rate_limit
from backend.app.config import settings
from backend.app.services.activity import log_event
from backend.app.services.cooldown import release_finished_cooldowns, in_cooldown, next_eligible_date
from pydantic import BaseModel, Field

router = APIRouter(prefix="/donors", tags=["Donors"])


class ContactMessage(BaseModel):
    message: Optional[str] = Field(default=None, max_length=500)
    urgency: Optional[str] = Field(default="Urgent", max_length=16)


def _can_see_contact(donor: Donor, user: Optional[User]) -> bool:
    """Phone/email are visible only to the donor themselves and administrators."""
    if not user:
        return False
    return user.role == "admin" or user.id == donor.user_id or user.email == donor.email

@router.get("")
def get_donors(
    blood_group: Optional[str] = Query(None, alias="blood_group"),
    bloodGroup: Optional[str] = Query(None, alias="bloodGroup"),
    city: Optional[str] = None,
    availability: Optional[str] = None,
    q: Optional[str] = None,
    verified: Optional[bool] = None,
    max_distance: Optional[float] = Query(None, ge=0, le=2000),
    sort: Optional[str] = Query(None, pattern="^(distance|match|donations)$"),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    optional_user: User = Depends(require_roles('requester'))
):
    release_finished_cooldowns(db)
    query = db.query(Donor)

    if verified is not None:
        query = query.filter(Donor.verified == verified)
    if max_distance is not None:
        query = query.filter(Donor.distance_km <= max_distance)

    bg = blood_group or bloodGroup
    if bg and bg.lower() != "all":
        query = query.filter(Donor.blood_group == bg.strip().upper())

    if city and city.lower() != "all":
        query = query.filter(Donor.city.ilike(f"%{city.strip()}%"))

    if availability and availability.lower() != "all":
        query = query.filter(Donor.availability.ilike(f"%{availability.strip()}%"))

    if q and q.strip():
        search_term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Donor.name.ilike(search_term),
                Donor.location.ilike(search_term),
                Donor.city.ilike(search_term),
                Donor.blood_group.ilike(search_term)
            )
        )

    total = query.count()  # all matching donors, so the page numbers know how many pages there are

    # The chosen sort first. Verified donors, newest and id break ties so the order never changes between pages.
    if sort == "distance":
        keys = [Donor.distance_km.asc(), Donor.match_percentage.desc()]
    elif sort == "donations":
        keys = [Donor.total_donations.desc()]
    else:  # "match" or no choice
        keys = [Donor.match_percentage.desc(), Donor.distance_km.asc()]
    query = query.order_by(*keys, Donor.verified.desc(), Donor.created_at.desc(), Donor.id.asc())
    results = query.offset(offset).limit(limit).all()

    return {
        "donors": [d.to_dict(include_contact=_can_see_contact(d, optional_user)) for d in results],
        "count": len(results),
        "total": total,
    }


def _short_name(name: str) -> str:
    """'Rahim Ahmed' -> 'Rahim A.'  (a public list never shows a full name)."""
    parts = (name or "").split()
    if len(parts) <= 1:
        return parts[0] if parts else "Donor"
    return f"{parts[0]} {parts[-1][:1]}."


@router.get("/verified", dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))])
def get_verified_donors(
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Public: verified donors for the home page. First name + initial, blood group, city and donation count only.
    No phone, e-mail or exact area."""
    release_finished_cooldowns(db)
    base = db.query(Donor).filter(Donor.verified == True)  # noqa: E712
    total = base.count()
    rows = base.order_by(Donor.total_donations.desc(), Donor.created_at.desc(), Donor.id.asc()).limit(limit).all()
    return {
        "donors": [{
            "id": d.id,
            "name": _short_name(d.name),
            "bloodGroup": d.blood_group,
            "city": d.city,
            "availability": d.availability,
            "totalDonations": d.total_donations or 0,
            "verified": True,
        } for d in rows],
        "count": len(rows),
        "total": total,
    }

@router.get("/{id}")
def get_donor_by_id(id: str, db: Session = Depends(get_db), optional_user: User = Depends(get_member)):
    donor = db.query(Donor).filter(
        or_(Donor.id == id, Donor.email == id.lower())
    ).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")

    is_eligible = donor.availability == "Available"
    eligibility_reason = (
        "Eligible to donate whole blood today"
        if is_eligible
        else "Currently in recommended donation cooldown or marked unavailable"
    )

    history = db.query(DonationRecord).filter(
        or_(DonationRecord.donor_name == donor.name, DonationRecord.donor_id == donor.id)
    ).order_by(DonationRecord.created_at.desc()).all()

    if optional_user.role == 'donor' and donor.user_id != optional_user.id:
        raise HTTPException(status_code=403, detail='Donors can only open their own profile.')
    donor_data = donor.to_dict(include_contact=_can_see_contact(donor, optional_user))
    donor_data["isEligible"] = is_eligible
    donor_data["eligibilityReason"] = eligibility_reason
    donor_data["donationHistory"] = [h.to_dict() for h in history]

    return {"donor": donor_data}

@router.get("/{id}/history")
def get_donor_history(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_member)):
    donor = db.query(Donor).filter(
        or_(Donor.id == id, Donor.email == id.lower())
    ).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")

    if current_user.role == 'donor' and donor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail='Donors can only open their own history.')

    history = db.query(DonationRecord).filter(
        or_(DonationRecord.donor_name == donor.name, DonationRecord.donor_id == donor.id)
    ).order_by(DonationRecord.created_at.desc()).all()

    return {
        "donorId": donor.id,
        "donations": [h.to_dict() for h in history],
        "count": len(history)
    }

@router.post("", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60))])
def create_donor(
    data: DonorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_member)
):
    """Create the signed-in user's own donor profile (one per account)."""
    existing = db.query(Donor).filter(
        or_(Donor.user_id == current_user.id, Donor.email == current_user.email)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="A donor profile already exists for this account.")

    new_donor = Donor(
        id=new_id("donor"),
        user_id=current_user.id,
        name=data.name.strip(),
        blood_group=data.bloodGroup.strip().upper(),
        location=(data.location or data.city or "Sylhet").strip(),
        city=(data.city or "Sylhet").strip(),
        distance_km=0.0,
        availability="Recently Donated" if in_cooldown(data.lastDonationDate) else "Available",
        match_percentage=0,
        last_donation_date=data.lastDonationDate or "Never",
        total_donations=0,
        phone=(data.phone or current_user.phone or "").strip(),
        email=current_user.email,  # always the authenticated user's email
        verified=False,             # only an administrator can verify a donor
        bio=data.bio or "Voluntary blood donor registered via LIFORA."
    )
    db.add(new_donor)
    db.commit()
    db.refresh(new_donor)

    return {
        "message": "Donor profile created successfully",
        "donor": new_donor.to_dict()
    }

@router.put("/{id}/availability")
def update_availability(
    id: str,
    data: DonorAvailabilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_member)
):
    donor = db.query(Donor).filter(
        or_(Donor.id == id, Donor.email == id.lower())
    ).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor record not found")

    # Authorization check: only the donor themselves or an admin can update
    if current_user.role != "admin" and current_user.email != donor.email and current_user.id != donor.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify another donor's availability."
        )

    if data.availability == "Available" and current_user.role != "admin" and in_cooldown(donor.last_donation_date):
        raise HTTPException(
            status_code=400,
            detail=f"You donated recently. You can be marked available again on {next_eligible_date(donor.last_donation_date).isoformat()}.",
        )

    donor.availability = data.availability

    # Also update linked user profile if exists
    user = db.query(User).filter(User.email == donor.email).first()
    if user:
        user.availability = data.availability

    db.commit()
    db.refresh(donor)

    return {
        "message": f"Donor availability updated to {data.availability}",
        "donor": donor.to_dict()
    }

@router.get("/{id}/contact-info", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=3600))])
def get_contact_info(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles('requester'))
):
    """Real phone/email, only for signed-in users, rate-limited to slow down scraping."""
    donor = db.query(Donor).filter(Donor.id == id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    return {
        "donorId": donor.id,
        "contactName": donor.name,
        "phone": donor.phone,
        "email": donor.email
    }


@router.post("/{id}/contact", dependencies=[Depends(rate_limit(max_requests=10, window_seconds=3600))])
def contact_donor(
    id: str,
    payload: ContactMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles('requester'))
):
    """Send an in-app message to the donor (no SMS/push is claimed or sent)."""
    donor = db.query(Donor).filter(Donor.id == id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")

    delivered = False
    donor_user = db.query(User).filter(
        or_(User.id == donor.user_id, User.email == donor.email)
    ).first() if (donor.user_id or donor.email) else None
    if donor_user:
        text = (payload.message or "A requester would like to contact you.").strip()
        db.add(AppNotification(
            id=new_id("notif"),
            user_id=donor_user.id,
            type="general",
            title="A requester wants to reach you",
            message=text[:500],
            is_read=False
        ))
        db.commit()
        delivered = True

    return {
        "message": "In-app message delivered to the donor." if delivered
                   else "This donor has no linked account, so no in-app message could be delivered.",
        "delivered": delivered,
        "donorId": donor.id,
        "contactName": donor.name
    }


@router.put("/{id}/verify")
def verify_donor(
    id: str,
    verified: bool = True,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    donor = db.query(Donor).filter(Donor.id == id).first()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    have = donor.total_donations or 0
    if verified and have < settings.MIN_DONATIONS_TO_VERIFY:
        raise HTTPException(
            status_code=400,
            detail=f"A donor needs at least {settings.MIN_DONATIONS_TO_VERIFY} confirmed donations before being verified (this donor has {have}).",
        )
    donor.verified = verified
    db.commit()
    log_event(db, "donor_verified" if verified else "donor_unverified", admin, "donor", donor.id,
              f"{donor.name} ({donor.blood_group}), {have} donation(s)")
    return {"message": "Donor verification updated", "donor": donor.to_dict()}
