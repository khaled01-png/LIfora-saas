import datetime
import uuid
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from backend.app.models.user import User
from backend.app.models.donor import Donor
from backend.app.models.blood_request import BloodRequest
from backend.app.models.response import BloodRequestResponse
from backend.app.models.donation import DonationRecord
from backend.app.models.inventory import InventoryItem
from backend.app.models.notification import AppNotification
from backend.app.services.compatibility_service import is_blood_compatible
from backend.app.services.cooldown import release_finished_cooldowns
from backend.app.utils.ids import new_id
from backend.app.services.activity import log_event
from backend.app.config import settings
import logging
import re

log = logging.getLogger("lifora.requests")

DEFAULT_REQUEST_LIFETIME_HOURS = 24
INACTIVE_STATUSES = {"Fulfilled", "Cancelled", "Expired"}


def parse_deadline_hours(deadline: Optional[str]) -> int:
    """'Within 4 hours' -> 4, 'Within 2 days' -> 48. Falls back to 24 hours."""
    if not deadline:
        return DEFAULT_REQUEST_LIFETIME_HOURS
    m = re.search(r"(\d+)\s*(hour|hr|h\b|day|d\b)", deadline.lower())
    if not m:
        return DEFAULT_REQUEST_LIFETIME_HOURS
    n = int(m.group(1))
    hours = n * 24 if m.group(2).startswith("d") else n
    return max(1, min(hours, 24 * 14))


def expire_stale_requests(db: Session) -> int:
    """Move overdue Pending/In Progress requests to 'Expired' so donors stop seeing them."""
    now = datetime.datetime.utcnow()
    changed = db.query(BloodRequest).filter(
        BloodRequest.status.in_(["Pending", "In Progress"]),
        BloodRequest.expires_at.isnot(None),
        BloodRequest.expires_at < now,
    ).update({"status": "Expired"}, synchronize_session=False)
    if changed:
        db.commit()
    return changed


def same_area(a: Optional[str], b: Optional[str]) -> bool:
    """City-level match ("Sylhet" == "Sylhet City"). Real distance needs map coordinates (not available yet)."""
    x, y = (a or "").strip().lower(), (b or "").strip().lower()
    if not x or not y:
        return True
    return x == y or x in y or y in x


def create_blood_request(db: Session, request_data: dict, current_user: Optional[User]) -> BloodRequest:
    req_id = new_id("req")
    user_id = current_user.id if current_user else None

    new_req = BloodRequest(
        id=req_id,
        user_id=user_id,
        patient_name=request_data["patientName"].strip(),
        blood_group=request_data["bloodGroup"].strip().upper(),
        units_needed=request_data.get("unitsNeeded", 1),
        hospital_name=request_data["hospitalName"].strip(),
        city=request_data.get("city", "Sylhet").strip(),
        urgency=request_data.get("urgency", "Urgent").strip(),
        deadline=request_data.get("deadline", "Within 4 hours").strip(),
        reason=request_data.get("reason", "Emergency transfusion required").strip(),
        status="Pending",
        contact_person=request_data.get("contactPerson", "Family Guardian").strip(),
        contact_phone=request_data["contactPhone"].strip(),
        responses_count=0,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(hours=parse_deadline_hours(request_data.get("deadline")))
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    # Broadcast notification to compatible available donors (in-app now, e-mail afterwards in the background)
    recipients = []
    available_donors = db.query(Donor).filter(Donor.availability == "Available").all()
    for d in available_donors:
        if is_blood_compatible(d.blood_group, new_req.blood_group) and same_area(d.city, new_req.city):
            donor_user = db.query(User).filter(User.email == d.email).first()
            if donor_user and donor_user.id != new_req.user_id:
                notif = AppNotification(
                    id=new_id("notif"),
                    user_id=donor_user.id,
                    request_id=new_req.id,
                    type="request_match",
                    title=f"Possible match: {new_req.blood_group} needed ({new_req.urgency})",
                    message=f"A patient at {new_req.hospital_name} urgently needs {new_req.units_needed} unit(s) of {new_req.blood_group}.",
                    is_read=False
                )
                db.add(notif)
                if len(recipients) < settings.MAX_REQUEST_EMAILS and not donor_user.email.endswith("@deleted.invalid"):
                    recipients.append({"email": donor_user.email, "name": donor_user.name, "bloodGroup": d.blood_group})
    db.commit()
    log_event(db, "request_created", current_user, "request", new_req.id,
              f"{new_req.units_needed} unit(s) of {new_req.blood_group} at {new_req.hospital_name}, {new_req.city} ({new_req.urgency}); {len(recipients)} donor(s) matched")
    new_req.email_recipients = recipients  # plain attribute (not a column): the route e-mails them in the background
    return new_req

def respond_to_blood_request(
    db: Session, 
    request_id: str, 
    current_user: User, 
    message: Optional[str] = None
) -> Tuple[BloodRequestResponse, BloodRequest]:
    # 1. Verify request exists and is active
    blood_req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not blood_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blood request not found"
        )
    if blood_req.status in INACTIVE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot respond to blood request in '{blood_req.status}' state."
        )

    if blood_req.user_id and blood_req.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot respond to your own blood request.")

    # 2. Identify donor profile for authenticated user
    donor = db.query(Donor).filter(Donor.email == current_user.email).first()
    if not donor and current_user.role == "donor":
        # Create donor profile for authenticated user if not existing
        donor = Donor(
            id=new_id("donor"),
            user_id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            blood_group=current_user.blood_group or "O+",
            city=current_user.city or "Sylhet",
            location=current_user.location or current_user.city or "Sylhet",
            phone=current_user.phone or "",
            availability="Available",
            verified=False
        )
        db.add(donor)
        db.commit()
        db.refresh(donor)

    if not donor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A registered donor profile is required to respond to blood requests."
        )

    # 3. Check donor availability (a finished cool-down frees the donor automatically)
    release_finished_cooldowns(db, donor)
    db.refresh(donor)
    if donor.availability != "Available":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Your donor availability is currently '{donor.availability}'. You must be marked 'Available' to respond."
        )

    # 4. Check compatibility
    if not is_blood_compatible(donor.blood_group, blood_req.blood_group):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incompatible blood type: Donor {donor.blood_group} cannot donate to recipient {blood_req.blood_group}."
        )

    # 5. Check duplicate response
    existing = db.query(BloodRequestResponse).filter(
        BloodRequestResponse.request_id == request_id,
        BloodRequestResponse.donor_id == donor.id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted a response to this blood request."
        )

    # 6. Create response and update request in transaction
    try:
        res_id = new_id("res")
        new_response = BloodRequestResponse(
            id=res_id,
            request_id=request_id,
            donor_id=donor.id,
            requester_id=blood_req.user_id,
            status="accepted",
            message=message or f"Ready to donate {donor.blood_group} blood for {blood_req.patient_name}."
        )
        db.add(new_response)

        blood_req.responses_count = (blood_req.responses_count or 0) + 1
        if blood_req.status == "Pending":
            blood_req.status = "In Progress"

        # Notify requester (only if the request is linked to an account)
        target_user_id = blood_req.user_id
        notif = AppNotification(
            id=new_id("notif"),
            user_id=target_user_id,
            request_id=blood_req.id,
            response_id=new_response.id,
            type="donor_responded",
            title=f"{donor.name} ({donor.blood_group}) Responded!",
            message=f"Donor {donor.name} is ready to donate for {blood_req.patient_name} at {blood_req.hospital_name}.",
            is_read=False
        )
        if target_user_id:
            db.add(notif)
        db.commit()
        db.refresh(new_response)
        db.refresh(blood_req)
        log_event(db, "donor_responded", current_user, "request", blood_req.id,
                  f"{donor.name} ({donor.blood_group}) accepted the request at {blood_req.hospital_name}")
        return new_response, blood_req
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="You have already submitted a response to this blood request.")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not record your response. Please try again.")

def _finalize_donation(
    db: Session,
    blood_req: BloodRequest,
    target_donor: Donor,
    responded: BloodRequestResponse,
    units_count: int,
    actor: Optional[User] = None,
    auto: bool = False,
) -> DonationRecord:
    """One confirmed donation. Counts as ONE donation for the donor, however many units were given.
    Caller commits (or rolls back). Used by the requester's confirmation and by the 24-hour automatic one."""
    today_str = datetime.date.today().isoformat()
    units_count = max(1, units_count)

    if blood_req.status != "Cancelled":
        blood_req.status = "Fulfilled"
    responded.status = "completed"  # the donor's response is now a finished donation

    target_donor.total_donations = (target_donor.total_donations or 0) + 1
    target_donor.last_donation_date = today_str
    target_donor.availability = "Recently Donated"

    linked_user = db.query(User).filter(User.email == target_donor.email).first()
    if linked_user:
        linked_user.total_donations = (linked_user.total_donations or 0) + 1
        linked_user.last_donation = today_str
        linked_user.availability = "Recently Donated"

    record = DonationRecord(
        id=new_id("rec"),
        donor_id=target_donor.id,
        donor_name=target_donor.name,
        blood_group=target_donor.blood_group,
        center_name=blood_req.hospital_name,
        date=today_str,
        units=units_count,
        status="Completed",
        request_id=blood_req.id
    )
    db.add(record)

    inv_item = db.query(InventoryItem).filter(InventoryItem.blood_group == target_donor.blood_group).first()
    if inv_item:
        inv_item.available_units = inv_item.available_units + units_count
        inv_item.last_updated = "Just now"

    if linked_user:
        db.add(AppNotification(
            id=new_id("notif"),
            user_id=linked_user.id,
            request_id=blood_req.id,
            type="response_status",
            title="Donation confirmed",
            message=(
                f"Your donation for the request at {blood_req.hospital_name} was marked as donated automatically, "
                f"because the requester did not answer within {settings.AUTO_CONFIRM_HOURS} hours. Thank you for helping!"
                if auto else
                f"Your donation of {units_count} unit(s) at {blood_req.hospital_name} has been confirmed by the person who requested blood. Thank you for helping!"
            ),
            is_read=False
        ))
    if auto and blood_req.user_id:
        db.add(AppNotification(
            id=new_id("notif"),
            user_id=blood_req.user_id,
            request_id=blood_req.id,
            type="response_status",
            title="Donation marked as donated",
            message=f"{target_donor.name} said they donated and you did not answer within {settings.AUTO_CONFIRM_HOURS} hours, so it was marked as donated. If this is wrong, please contact the LIFORA administrators.",
            is_read=False
        ))

    log_event(
        db, "donation_auto_confirmed" if auto else "donation_confirmed", actor, "donation", record.id,
        f"{target_donor.name} ({target_donor.blood_group}) donated {units_count} unit(s) at {blood_req.hospital_name}"
        + (f" (automatic after {settings.AUTO_CONFIRM_HOURS} hours)" if auto else ""),
        commit=False,
    )
    return record


def claim_donation(db: Session, request_id: str, current_user: User) -> Tuple[BloodRequestResponse, BloodRequest]:
    """The donor presses "I donated". The requester confirms it, or it is confirmed automatically later."""
    blood_req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not blood_req:
        raise HTTPException(status_code=404, detail="Blood request not found")
    donor = db.query(Donor).filter(Donor.email == current_user.email).first()
    if not donor:
        raise HTTPException(status_code=400, detail="A registered donor profile is required.")
    resp = db.query(BloodRequestResponse).filter(
        BloodRequestResponse.request_id == request_id,
        BloodRequestResponse.donor_id == donor.id,
    ).first()
    if not resp:
        raise HTTPException(status_code=400, detail="You have not responded to this blood request.")
    if resp.status == "claimed":
        raise HTTPException(status_code=409, detail="You already told us you donated. Waiting for the requester to confirm.")
    if resp.status == "completed":
        raise HTTPException(status_code=409, detail="This donation is already confirmed.")
    if resp.status not in ("accepted", "booked"):
        raise HTTPException(status_code=400, detail=f"Your response is '{resp.status}', so it cannot be marked as donated.")
    if blood_req.status in ("Fulfilled", "Cancelled"):
        raise HTTPException(status_code=400, detail=f"This request is already {blood_req.status.lower()}.")

    resp.status = "claimed"
    resp.donor_claimed_at = datetime.datetime.utcnow()
    if blood_req.user_id:
        db.add(AppNotification(
            id=new_id("notif"),
            user_id=blood_req.user_id,
            request_id=blood_req.id,
            response_id=resp.id,
            type="response_status",
            title=f"{donor.name} says they donated",
            message=(f"{donor.name} ({donor.blood_group}) says they gave blood at {blood_req.hospital_name}. "
                     f"Please confirm it. If you do not answer within {settings.AUTO_CONFIRM_HOURS} hours it will be marked as donated automatically."),
            is_read=False
        ))
    db.commit()
    db.refresh(resp)
    db.refresh(blood_req)
    log_event(db, "donor_claimed_donation", current_user, "request", blood_req.id,
              f"{donor.name} ({donor.blood_group}) pressed 'I donated' for the request at {blood_req.hospital_name}")
    return resp, blood_req


def auto_confirm_overdue(db: Session) -> int:
    """'I donated' claims the requester has not answered for AUTO_CONFIRM_HOURS become confirmed donations."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=settings.AUTO_CONFIRM_HOURS)
    due = db.query(BloodRequestResponse).filter(
        BloodRequestResponse.status == "claimed",
        BloodRequestResponse.donor_claimed_at.isnot(None),
        BloodRequestResponse.donor_claimed_at <= cutoff,
    ).limit(50).all()
    done = 0
    for resp in due:
        try:
            blood_req = db.query(BloodRequest).filter(BloodRequest.id == resp.request_id).with_for_update().first()
            donor = db.query(Donor).filter(Donor.id == resp.donor_id).first()
            if not blood_req or not donor or blood_req.status == "Cancelled":
                resp.status = "cancelled"
                db.commit()
                continue
            _finalize_donation(db, blood_req, donor, resp, 1, actor=None, auto=True)
            db.commit()
            done += 1
        except Exception:
            db.rollback()
            log.exception("Automatic donation confirmation failed for response %s", resp.id)
    return done


def run_maintenance(db: Session) -> None:
    """Housekeeping that must happen on its own: expired requests, finished cool-downs, 24-hour confirmations."""
    expire_stale_requests(db)
    release_finished_cooldowns(db)
    auto_confirm_overdue(db)


def confirm_donation_transaction(
    db: Session,
    request_id: str,
    donor_id: Optional[str],
    response_id: Optional[str],
    units: int,
    current_user: User
) -> Tuple[BloodRequest, Donor, DonationRecord]:
    """Database-safe atomic transaction for blood donation fulfillment."""
    blood_req = db.query(BloodRequest).filter(BloodRequest.id == request_id).with_for_update().first()
    if not blood_req:
        raise HTTPException(status_code=404, detail="Blood request not found")

    if not (current_user.role == "admin" or (blood_req.user_id and blood_req.user_id == current_user.id)):
        raise HTTPException(status_code=403, detail="Only the requester or an administrator can confirm a donation.")

    target_donor = None
    if donor_id:
        target_donor = db.query(Donor).filter(Donor.id == donor_id).first()
    elif response_id:
        resp = db.query(BloodRequestResponse).filter(BloodRequestResponse.id == response_id).first()
        if resp:
            target_donor = db.query(Donor).filter(Donor.id == resp.donor_id).first()

    if not target_donor:
        # Fallback to first donor associated with request responses
        resp = db.query(BloodRequestResponse).filter(BloodRequestResponse.request_id == request_id).first()
        if resp:
            target_donor = db.query(Donor).filter(Donor.id == resp.donor_id).first()

    if not target_donor:
        raise HTTPException(status_code=400, detail="No donor record found to confirm donation.")

    responded = db.query(BloodRequestResponse).filter(
        BloodRequestResponse.request_id == request_id,
        BloodRequestResponse.donor_id == target_donor.id
    ).first()
    if not responded:
        raise HTTPException(status_code=400, detail="This donor has not responded to this request.")

    # An overdue request can still be confirmed when the donor already said "I donated" before it expired.
    claimed_expired = blood_req.status == "Expired" and responded.status == "claimed"
    if blood_req.status in INACTIVE_STATUSES and not claimed_expired:
        raise HTTPException(status_code=400, detail=f"This request is already {blood_req.status.lower()}.")
    if responded.status == "completed":
        raise HTTPException(status_code=400, detail="This donation is already confirmed.")

    try:
        record = _finalize_donation(db, blood_req, target_donor, responded, units, actor=current_user, auto=False)
        db.commit()
        db.refresh(blood_req)
        db.refresh(target_donor)
        db.refresh(record)
        return blood_req, target_donor, record
    except Exception:
        db.rollback()
        log.exception("Could not confirm donation for request %s", request_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not confirm the donation. Please try again."
        )
