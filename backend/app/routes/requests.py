from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.donor import Donor
from backend.app.models.blood_request import BloodRequest
from backend.app.models.response import BloodRequestResponse
from backend.app.models.notification import AppNotification
from backend.app.utils.ids import new_id
from backend.app.schemas.request import BloodRequestCreate, BloodRequestStatusUpdate
from backend.app.schemas.response import RespondRequest, BookDonorRequest, ConfirmDonationRequest
from backend.app.auth.dependencies import get_current_user, get_optional_user, require_admin, get_member, require_roles
from backend.app.services.compatibility_service import is_blood_compatible, get_compatible_recipients
from backend.app.services.request_service import (
    create_blood_request,
    respond_to_blood_request,
    confirm_donation_transaction,
    claim_donation,
    run_maintenance,
    expire_stale_requests,
    INACTIVE_STATUSES,
)
from backend.app.services.notify_email import send_request_emails
from backend.app.utils.rate_limiter import rate_limit

router = APIRouter(prefix="/requests", tags=["Blood Requests"])

def _request_ids_with_response_status(db: Session, ids, wanted: str) -> set:
    ids = list(ids)
    if not ids:
        return set()
    rows = db.query(BloodRequestResponse.request_id).filter(
        BloodRequestResponse.request_id.in_(ids), BloodRequestResponse.status == wanted
    ).all()
    return {r[0] for r in rows}


def booked_request_ids(db: Session, ids) -> set:
    return _request_ids_with_response_status(db, ids, "booked")


def claimed_request_ids(db: Session, ids) -> set:
    """Requests where a donor pressed "I donated" and the requester has not confirmed yet."""
    return _request_ids_with_response_status(db, ids, "claimed")


def display_status(req: BloodRequest, booked: set, claimed: frozenset = frozenset()) -> str:
    """Plain-language state: Waiting for a donor -> Donor accepted -> Donor booked -> Awaiting confirmation -> Donated."""
    if req.status == "Fulfilled":
        return "Donated"
    if req.status in ("Cancelled", "Expired"):
        return req.status
    if req.id in claimed:
        return "Awaiting confirmation"
    if req.id in booked:
        return "Donor booked"
    if (req.responses_count or 0) > 0 or req.status == "In Progress":
        return "Donor accepted"
    return "Waiting for a donor"


def is_owner_or_admin(req: BloodRequest, user: Optional[User]) -> bool:
    return bool(user) and (user.role == "admin" or (req.user_id is not None and req.user_id == user.id))


def require_owner_or_admin(req: BloodRequest, user: User) -> None:
    if not is_owner_or_admin(req, user):
        raise HTTPException(status_code=403, detail="Only the requester or an administrator can do this.")


def build_request_dict(req: BloodRequest, db: Session, viewer: Optional[User] = None):
    """Responses (which include donor contact details) are only included for the owner/admin."""
    owner_view = is_owner_or_admin(req, viewer)
    resp_list = []
    if owner_view:
        responses = db.query(BloodRequestResponse).filter(BloodRequestResponse.request_id == req.id).all()
        donors = {d.id: d for d in db.query(Donor).filter(Donor.id.in_([r.donor_id for r in responses])).all()} if responses else {}
        for r in responses:
            donor = donors.get(r.donor_id)
            resp_list.append(r.to_dict(donor_dict=donor.to_dict() if donor else None))

    # Donor phone/email only for signed-in users; guests get the request without private contact data.
    req_data = req.to_dict(include_contact=viewer is not None)
    req_data["displayStatus"] = display_status(req, booked_request_ids(db, [req.id]), claimed_request_ids(db, [req.id]))
    req_data["responses"] = resp_list
    req_data["bookedDonors"] = [r for r in resp_list if r["status"] in {"accepted", "booked", "claimed"}]
    return req_data

def fetch_requests_list(
    db: Session,
    blood_group: Optional[str] = None,
    urgency: Optional[str] = None,
    status_filter: Optional[str] = None,
    city: Optional[str] = None,
    mode: Optional[str] = None,
    optional_user: Optional[User] = None,
    limit: int = 200,
    offset: int = 0,
):
    run_maintenance(db)
    query = db.query(BloodRequest)

    # Role-based feeds: a requester only ever sees their own requests; a donor only sees open requests
    # that their own blood group can actually give to (a request never shows up in everybody's feed).
    if optional_user is not None and optional_user.role == "requester":
        query = query.filter(BloodRequest.user_id == optional_user.id)
    elif optional_user is not None and optional_user.role == "donor":
        query = query.filter(BloodRequest.status.in_(["Pending", "In Progress"]))
        own_donor = db.query(Donor).filter(Donor.email == optional_user.email).first()
        own_group = own_donor.blood_group if own_donor else optional_user.blood_group
        if not own_group:
            return {"requests": [], "count": 0}
        query = query.filter(BloodRequest.blood_group.in_(get_compatible_recipients(own_group)))

    if mode == "feed":
        # Donor Feed: strictly enforce compatibility and donor availability!
        donor = None
        if optional_user:
            donor = db.query(Donor).filter(Donor.email == optional_user.email).first()
        if not donor:
            # Guests / non-donors have no blood group on record: show nothing rather than guessing one.
            return {"requests": [], "count": 0}
        if donor.availability != "Available":
            return {"requests": [], "count": 0, "reason": "Donor is currently unavailable or in cooldown."}

        donor_group = donor.blood_group
        # Only active requests
        query = query.filter(BloodRequest.status.in_(["Pending", "In Progress", "Active"]))
        
        # Centralized compatibility: only requests with blood groups this donor can give to
        compatible_groups = get_compatible_recipients(donor_group)
        query = query.filter(BloodRequest.blood_group.in_(compatible_groups))
        # Critical requests DO NOT bypass compatibility!

    elif mode == "ongoing":
        query = query.filter(BloodRequest.status.in_(["Pending", "In Progress"]))
    elif mode == "emergency":
        query = query.filter(BloodRequest.urgency.in_(["Critical", "Urgent"]))

    if blood_group and isinstance(blood_group, str) and blood_group.lower() != "all":
        query = query.filter(BloodRequest.blood_group == blood_group.strip().upper())

    if urgency and isinstance(urgency, str) and urgency.lower() != "all":
        query = query.filter(BloodRequest.urgency.ilike(urgency.strip()))

    if status_filter and isinstance(status_filter, str) and status_filter.lower() != "all":
        query = query.filter(BloodRequest.status.ilike(status_filter.strip()))

    if city and isinstance(city, str) and city.lower() != "all":
        query = query.filter(BloodRequest.city.ilike(f"%{city.strip()}%"))

    query = query.order_by(BloodRequest.created_at.desc()).offset(max(0, offset)).limit(max(1, min(limit, 500)))
    results = query.all()
    booked = booked_request_ids(db, [r.id for r in results])
    claimed = claimed_request_ids(db, [r.id for r in results])

    return {
        "requests": [dict(r.to_dict(include_contact=optional_user is not None), displayStatus=display_status(r, booked, claimed)) for r in results],
        "count": len(results)
    }

@router.get("")
def get_requests(
    blood_group: Optional[str] = Query(None, alias="blood_group"),
    bloodGroup: Optional[str] = Query(None, alias="bloodGroup"),
    urgency: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    city: Optional[str] = None,
    mode: Optional[str] = None,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    optional_user: User = Depends(require_roles("donor", "requester"))
):
    bg = blood_group or bloodGroup
    return fetch_requests_list(
        db=db,
        blood_group=bg,
        urgency=urgency,
        status_filter=status_filter,
        city=city,
        mode=mode,
        optional_user=optional_user,
        limit=limit,
        offset=offset,
    )

@router.get("/feed")
def get_donor_feed(
    db: Session = Depends(get_db),
    optional_user: User = Depends(require_roles("donor"))
):
    """Authoritative server-side compatibility feed for donors."""
    return fetch_requests_list(db=db, mode="feed", optional_user=optional_user)

@router.get("/shared/{id}", dependencies=[Depends(rate_limit(max_requests=60, window_seconds=60))])
def get_shared_request(id: str, db: Session = Depends(get_db)):
    """What a shared request link shows to anybody who opens it, signed in or not.
    Only the basics: no patient name, no phone number, no reason. Accepting still needs a donor account."""
    expire_stale_requests(db)
    req = db.query(BloodRequest).filter(BloodRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="This request link is not valid.")
    return {"request": {
        "id": req.id,
        "bloodGroup": req.blood_group,
        "unitsNeeded": req.units_needed,
        "hospitalName": req.hospital_name,
        "city": req.city,
        "urgency": req.urgency,
        "deadline": req.deadline,
        "status": req.status,
        "displayStatus": display_status(req, booked_request_ids(db, [req.id]), claimed_request_ids(db, [req.id])),
        "isOpen": req.status in ("Pending", "In Progress"),
        "createdAt": req.created_at.strftime("%Y-%m-%d %H:%M") if req.created_at else None,
    }}


@router.get("/{id}")
def get_request_by_id(
    id: str,
    db: Session = Depends(get_db),
    optional_user: User = Depends(get_member)
):
    expire_stale_requests(db)
    req = db.query(BloodRequest).filter(BloodRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Blood request not found")
    if optional_user.role == "requester" and req.user_id != optional_user.id:
        raise HTTPException(status_code=403, detail="You can only open your own requests.")
    return {"request": build_request_dict(req, db, optional_user)}

@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))])
def create_request(
    data: BloodRequestCreate,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("requester"))
):
    payload = data.model_dump()
    duplicate = db.query(BloodRequest).filter(
        BloodRequest.user_id == current_user.id,
        BloodRequest.patient_name == payload["patientName"].strip(),
        BloodRequest.blood_group == payload["bloodGroup"].strip().upper(),
        BloodRequest.hospital_name == payload["hospitalName"].strip(),
        BloodRequest.status.in_(["Pending", "In Progress"]),
    ).first()
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="You already have an active request for this patient, blood group and hospital."
        )
    active = db.query(BloodRequest).filter(
        BloodRequest.user_id == current_user.id,
        BloodRequest.status.in_(["Pending", "In Progress"]),
    ).count()
    if active >= 3:
        raise HTTPException(status_code=429, detail="You already have 3 open requests. Please wait for one to finish or cancel it first.")
    new_req = create_blood_request(db, payload, current_user)
    recipients = getattr(new_req, "email_recipients", [])
    if recipients:
        background.add_task(send_request_emails, recipients, new_req.to_dict())
    return {
        "message": f"Emergency blood request broadcasted for {new_req.blood_group} at {new_req.hospital_name}.",
        "request": new_req.to_dict()
    }

@router.post("/{id}/respond", dependencies=[Depends(rate_limit(max_requests=15, window_seconds=60))])
def respond_request(
    id: str,
    payload: RespondRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("donor"))
):
    resp, req = respond_to_blood_request(db, id, current_user, payload.message)
    donor = db.query(Donor).filter(Donor.id == resp.donor_id).first()
    return {
        "message": f"Thank you, {donor.name if donor else current_user.name}! Your response has been recorded.",
        "response": resp.to_dict(donor_dict=donor.to_dict() if donor else None),
        "request": dict(req.to_dict(), displayStatus=display_status(req, {req.id}))
    }

@router.post("/{id}/book")
def book_donor(
    id: str,
    payload: BookDonorRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_member)
):
    req = db.query(BloodRequest).filter(BloodRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Blood request not found")
    require_owner_or_admin(req, current_user)
    if req.status in INACTIVE_STATUSES:
        raise HTTPException(status_code=400, detail=f"This request is already {req.status.lower()}.")

    resp = db.query(BloodRequestResponse).filter(
        BloodRequestResponse.id == payload.responseId,
        BloodRequestResponse.request_id == id
    ).first()
    if not resp:
        raise HTTPException(status_code=404, detail="Matching response record not found")

    if resp.status not in ("accepted", "booked"):
        raise HTTPException(status_code=400, detail=f"This donor's response is already '{resp.status}'.")
    resp.status = "booked"
    req.status = "In Progress"
    db.commit()
    db.refresh(resp)
    db.refresh(req)

    donor = db.query(Donor).filter(Donor.id == resp.donor_id).first()
    donor_user = db.query(User).filter(or_(User.id == (donor.user_id if donor else None), User.email == (donor.email if donor else None))).first() if donor else None
    if donor_user and donor_user.id != req.user_id:
        db.add(AppNotification(
            id=new_id("notif"), user_id=donor_user.id, request_id=req.id, type="response_status",
            title="You were booked",
            message=f"The family of {req.patient_name} chose you as the donor at {req.hospital_name}. Please contact them and go to the hospital.",
            is_read=False))
        db.commit()
    return {
        "message": f"Donor {donor.name if donor else ''} has been successfully BOOKED for this request.",
        "response": resp.to_dict(donor_dict=donor.to_dict() if donor else None),
        "request": req.to_dict()
    }

@router.post("/{id}/donated", dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))])
def donor_says_donated(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("donor"))
):
    """The donor presses "I donated". The requester confirms it, or it is confirmed automatically after 24 hours."""
    resp, req = claim_donation(db, id, current_user)
    return {
        "message": "Thank you! The requester was asked to confirm. If they do not answer within 24 hours it counts automatically.",
        "response": resp.to_dict(),
        "request": dict(req.to_dict(), displayStatus=display_status(req, set(), frozenset({req.id}))),
    }


@router.post("/{id}/confirm-donation")
def confirm_donation(
    id: str,
    payload: ConfirmDonationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_member)
):
    req, donor, record = confirm_donation_transaction(
        db, id, payload.donorId, payload.responseId, payload.units or 1, current_user
    )
    return {
        "message": f"Blood donation verified! {record.units} unit(s) of {donor.blood_group} confirmed for {req.patient_name}.",
        "donor": donor.to_dict(),
        "request": dict(req.to_dict(), displayStatus=display_status(req, set())),
        "donation": record.to_dict()
    }

@router.get("/{id}/responses")
def get_request_responses(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_member)
):
    req = db.query(BloodRequest).filter(BloodRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Blood request not found")
    require_owner_or_admin(req, current_user)
    responses = db.query(BloodRequestResponse).filter(BloodRequestResponse.request_id == id).all()
    donors = {d.id: d for d in db.query(Donor).filter(Donor.id.in_([r.donor_id for r in responses])).all()} if responses else {}
    resp_list = []
    for r in responses:
        donor = donors.get(r.donor_id)
        resp_list.append(r.to_dict(donor_dict=donor.to_dict() if donor else None))
    return {
        "requestId": id,
        "responses": resp_list,
        "count": len(resp_list)
    }

@router.get("/{id}/my-response")
def check_my_response(
    id: str,
    donor_id: Optional[str] = Query(None, alias="donor_id"),
    db: Session = Depends(get_db),
    optional_user: User = Depends(require_roles("donor"))
):
    donor = None
    if optional_user:
        donor = db.query(Donor).filter(Donor.email == optional_user.email).first()  # own profile only

    if not donor:
        return {"hasResponded": False, "response": None}

    resp = db.query(BloodRequestResponse).filter(
        BloodRequestResponse.request_id == id,
        BloodRequestResponse.donor_id == donor.id
    ).first()

    return {
        "hasResponded": resp is not None,
        "response": resp.to_dict(donor_dict=donor.to_dict()) if resp else None
    }

@router.put("/{id}/status")
def update_request_status(
    id: str,
    payload: BloodRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_member)
):
    req = db.query(BloodRequest).filter(BloodRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Blood request not found")
    require_owner_or_admin(req, current_user)
    # Finished requests can only be reopened by an administrator.
    if req.status in INACTIVE_STATUSES and current_user.role != "admin":
        raise HTTPException(status_code=400, detail=f"This request is already {req.status.lower()}.")
    # Only the donation-confirmation flow may mark a request Fulfilled for non-admins.
    if payload.status == "Fulfilled" and current_user.role != "admin":
        raise HTTPException(status_code=400, detail="Use donation confirmation to mark a request as fulfilled.")

    req.status = payload.status
    db.commit()
    db.refresh(req)

    return {
        "message": f"Blood request status updated to {payload.status}",
        "request": req.to_dict()
    }
