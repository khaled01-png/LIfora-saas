from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.donor import Donor
from backend.app.models.user import User
from backend.app.models.blood_request import BloodRequest
from backend.app.models.response import BloodRequestResponse
from backend.app.models.donation import DonationRecord
from backend.app.models.center import BloodCenter
from backend.app.models.inventory import InventoryItem

router = APIRouter(tags=["Statistics"])

def compute_real_stats(db: Session):
    total_donors = db.query(Donor).count()

    # Accounts (counts only). Deleted accounts and administrators are left out.
    accounts = db.query(User).filter(User.role != "admin", ~User.email.like("%@deleted.invalid"))
    registered_accounts = accounts.filter(User.email_verified == True).count()  # noqa: E712
    requester_accounts = accounts.filter(User.email_verified == True, User.role == "requester").count()  # noqa: E712
    unfinished_accounts = accounts.filter(User.email_verified == True, User.role == "pending").count()  # noqa: E712
    awaiting_code_accounts = accounts.filter(User.email_verified == False).count()  # noqa: E712
    verified_donors = db.query(Donor).filter(Donor.verified == True).count()  # noqa: E712
    active_donors = db.query(Donor).filter(Donor.availability == "Available").count()
    recently_donated = db.query(Donor).filter(Donor.availability == "Recently Donated").count()

    active_requests = db.query(BloodRequest).filter(BloodRequest.status.in_(["Pending", "In Progress"])).count()
    fulfilled_requests = db.query(BloodRequest).filter(BloodRequest.status == "Fulfilled").count()
    total_requests = db.query(BloodRequest).count()

    successful_donations = db.query(DonationRecord).count()
    total_centers = db.query(BloodCenter).count()

    inv_sum = db.query(func.sum(InventoryItem.available_units)).scalar() or 0
    total_responses = db.query(BloodRequestResponse).count()

    if total_requests > 0:
        success_rate = round((fulfilled_requests / total_requests) * 100, 1)
    else:
        success_rate = 100.0

    lives_saved = successful_donations * 3

    return {
        "stats": {
            "totalDonors": total_donors,
            "verifiedDonors": verified_donors,
            "registeredAccounts": registered_accounts,
            "requesterAccounts": requester_accounts,
            "unfinishedAccounts": unfinished_accounts,
            "awaitingCodeAccounts": awaiting_code_accounts,
            "activeDonors": active_donors,
            "recentlyDonatedDonors": recently_donated,
            "activeRequests": active_requests,
            "successfulDonations": successful_donations,
            "fulfilledRequests": fulfilled_requests,
            "successRate": success_rate,
            "totalCenters": total_centers,
            "totalAvailableUnits": int(inv_sum),
            "totalResponses": total_responses,
            "livesSaved": lives_saved
        }
    }

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    return compute_real_stats(db)

@router.get("/blood/statistics")
def get_blood_statistics(db: Session = Depends(get_db)):
    return compute_real_stats(db)

@router.get("/blood")
def get_blood(db: Session = Depends(get_db)):
    return compute_real_stats(db)
