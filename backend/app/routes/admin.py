"""Administrator-only overview: accounts, requests, donations, activity log, and admin actions.
Passwords are never stored in readable form, so nobody (including administrators) can see them."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models.user import User
from backend.app.models.donor import Donor
from backend.app.models.blood_request import BloodRequest
from backend.app.models.response import BloodRequestResponse
from backend.app.models.donation import DonationRecord
from backend.app.models.inventory import InventoryItem
from backend.app.models.notification import AppNotification
from backend.app.models.activity import ActivityLog
from backend.app.auth.dependencies import require_admin
from backend.app.auth.security import create_reset_token
from backend.app.services.activity import log_event
from backend.app.services.cooldown import in_cooldown
from backend.app.utils.email import send_email, email_configured
from backend.app.utils.ids import new_id
from backend.app.utils.rate_limiter import rate_limit

router = APIRouter(prefix="/admin", tags=["Admin"])

_NOT_DELETED = ~User.email.like("%@deleted.invalid")


@router.get("/users")
def list_users(
    q: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Every account: who signed up, when, whether the e-mail is verified, and their role."""
    query = db.query(User).filter(_NOT_DELETED)
    if role and role != "all":
        query = query.filter(User.role == role)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(User.name.ilike(term) | User.email.ilike(term) | User.phone.ilike(term))
    total = query.count()
    rows = query.order_by(User.created_at.desc(), User.id.asc()).offset(offset).limit(limit).all()
    return {
        "users": [{
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "bloodGroup": u.blood_group,
            "city": u.city,
            "emailVerified": bool(u.email_verified),
            "profileCompleted": bool(u.profile_completed),
            "totalDonations": u.total_donations or 0,
            "createdAt": u.created_at.isoformat() if u.created_at else None,
        } for u in rows],
        "count": len(rows),
        "total": total,
    }


@router.get("/requests")
def list_requests(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Every blood request with who asked and which donors answered."""
    query = db.query(BloodRequest)
    if status and status != "all":
        query = query.filter(BloodRequest.status == status)
    total = query.count()
    rows = query.order_by(BloodRequest.created_at.desc(), BloodRequest.id.asc()).offset(offset).limit(limit).all()

    user_ids = {r.user_id for r in rows if r.user_id}
    users = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()} if user_ids else {}
    req_ids = [r.id for r in rows]
    responses = db.query(BloodRequestResponse).filter(BloodRequestResponse.request_id.in_(req_ids)).all() if req_ids else []
    donor_ids = {x.donor_id for x in responses}
    donors = {d.id: d for d in db.query(Donor).filter(Donor.id.in_(donor_ids)).all()} if donor_ids else {}

    by_request = {}
    for x in responses:
        d = donors.get(x.donor_id)
        by_request.setdefault(x.request_id, []).append({
            "id": x.id,
            "donorName": d.name if d else None,
            "donorBloodGroup": d.blood_group if d else None,
            "status": x.status,
            "createdAt": x.created_at.isoformat() if x.created_at else None,
            "donorClaimedAt": x.donor_claimed_at.isoformat() if x.donor_claimed_at else None,
        })

    out = []
    for r in rows:
        u = users.get(r.user_id)
        item = r.to_dict()
        item["requester"] = {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone} if u else None
        item["responses"] = by_request.get(r.id, [])
        out.append(item)
    return {"requests": out, "count": len(out), "total": total}


@router.get("/donations")
def list_donations(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Donation history: who gave blood, where, when."""
    query = db.query(DonationRecord)
    total = query.count()
    rows = query.order_by(DonationRecord.created_at.desc(), DonationRecord.id.asc()).offset(offset).limit(limit).all()
    return {
        "donations": [dict(r.to_dict(), createdAt=r.created_at.isoformat() if r.created_at else None) for r in rows],
        "count": len(rows),
        "total": total,
    }


def cancel_donation_record(db: Session, record: DonationRecord, admin: User) -> None:
    """Undo one wrongly confirmed donation: the donor's count, cool-down, stock and the request go back."""
    record.status = "Cancelled"

    donor = db.query(Donor).filter(Donor.id == record.donor_id).first() if record.donor_id else None
    if donor:
        remaining = db.query(DonationRecord).filter(
            DonationRecord.donor_id == donor.id,
            DonationRecord.status == "Completed",
            DonationRecord.id != record.id,
        ).all()
        last = max((r.date for r in remaining if r.date), default=None)
        donor.total_donations = max(0, (donor.total_donations or 0) - 1)
        donor.last_donation_date = last or "Never"
        if donor.availability == "Recently Donated" and not in_cooldown(last):
            donor.availability = "Available"
        linked = db.query(User).filter(User.email == donor.email).first()
        if linked:
            linked.total_donations = max(0, (linked.total_donations or 0) - 1)
            linked.last_donation = last
            if linked.availability == "Recently Donated" and not in_cooldown(last):
                linked.availability = "Available"
        if linked:
            db.add(AppNotification(
                id=new_id("notif"), user_id=linked.id, request_id=record.request_id, type="response_status",
                title="A donation record was cancelled",
                message=f"An administrator cancelled the donation record at {record.center_name}. If you think this is a mistake, please contact LIFORA.",
                is_read=False,
            ))

    inv = db.query(InventoryItem).filter(InventoryItem.blood_group == record.blood_group).first()
    if inv:
        inv.available_units = max(0, (inv.available_units or 0) - (record.units or 0))
        inv.last_updated = "Just now"

    if record.request_id and donor:
        resp = db.query(BloodRequestResponse).filter(
            BloodRequestResponse.request_id == record.request_id,
            BloodRequestResponse.donor_id == donor.id,
            BloodRequestResponse.status == "completed",
        ).first()
        if resp:
            resp.status = "accepted"
        other = db.query(DonationRecord).filter(
            DonationRecord.request_id == record.request_id,
            DonationRecord.status == "Completed",
            DonationRecord.id != record.id,
        ).count()
        req = db.query(BloodRequest).filter(BloodRequest.id == record.request_id).first()
        if req and req.status == "Fulfilled" and other == 0:
            req.status = "In Progress"

    log_event(db, "donation_cancelled", admin, "donation", record.id,
              f"{record.donor_name} ({record.blood_group}) at {record.center_name} was cancelled by an administrator",
              commit=False)


@router.post("/donations/{id}/cancel")
def cancel_donation(id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    record = db.query(DonationRecord).filter(DonationRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Donation record not found")
    if record.status != "Completed":
        raise HTTPException(status_code=400, detail=f"This donation is already {record.status.lower()}.")
    try:
        cancel_donation_record(db, record, admin)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not cancel the donation. Please try again.")
    db.refresh(record)
    return {"message": "Donation cancelled. The donor's count and cool-down were corrected.", "donation": record.to_dict()}


@router.get("/activity")
def list_activity(
    event: Optional[str] = None,
    limit: int = Query(100, ge=1, le=300),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Who did what and when (newest first)."""
    query = db.query(ActivityLog)
    if event and event != "all":
        query = query.filter(ActivityLog.event == event)
    total = query.count()
    rows = query.order_by(ActivityLog.created_at.desc(), ActivityLog.id.asc()).offset(offset).limit(limit).all()
    return {"activity": [r.to_dict() for r in rows], "count": len(rows), "total": total}


@router.post("/users/{id}/send-reset", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=3600))])
def send_reset_email(id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """E-mails the person a password-reset link. The administrator never sees the link or any password."""
    user = db.query(User).filter(User.id == id).first()
    if not user or user.email.endswith("@deleted.invalid"):
        raise HTTPException(status_code=404, detail="User not found")
    token = create_reset_token(user.id, user.hashed_password)
    link = f"{settings.FRONTEND_URL}/?reset_token={token}"
    sent = send_email(
        user.email,
        "Reset your LIFORA password",
        f"Hello {user.name},\n\nA LIFORA administrator sent you this link to choose a new password "
        f"(valid for {settings.RESET_TOKEN_MINUTES} minutes):\n{link}\n\n"
        "If you did not expect this, you can ignore this email.",
    )
    log_event(db, "password_reset_sent_by_admin", admin, "user", user.id, f"Reset e-mail for {user.email} (sent: {sent})")
    if not sent:
        raise HTTPException(
            status_code=503,
            detail="The e-mail could not be sent (the mail server is not set up or refused it).",
        )
    return {"message": f"A password reset link was e-mailed to {user.email}.", "emailConfigured": email_configured()}
