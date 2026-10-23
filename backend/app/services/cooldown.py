"""Donation cool-down: a donor who has just given blood must not be matched again until the gap has passed."""
import datetime
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.donor import Donor
from backend.app.models.user import User


def parse_date(value: Optional[str]) -> Optional[datetime.date]:
    """'2026-06-12' -> date. 'Never', empty or unreadable values give None (no known donation)."""
    try:
        return datetime.date.fromisoformat((value or "").strip()[:10])
    except ValueError:
        return None


def next_eligible_date(last_donation: Optional[str]) -> Optional[datetime.date]:
    last = parse_date(last_donation)
    return last + datetime.timedelta(days=settings.DONATION_COOLDOWN_DAYS) if last else None


def in_cooldown(last_donation: Optional[str]) -> bool:
    eligible = next_eligible_date(last_donation)
    return bool(eligible) and datetime.date.today() < eligible


def release_finished_cooldowns(db: Session, donor: Optional[Donor] = None) -> int:
    """Flip 'Recently Donated' back to 'Available' once the gap is over. Returns how many donors changed."""
    query = db.query(Donor).filter(Donor.availability == "Recently Donated")
    if donor is not None:
        query = query.filter(Donor.id == donor.id)
    changed = 0
    for d in query.all():
        if parse_date(d.last_donation_date) is None or in_cooldown(d.last_donation_date):
            continue  # unknown date: leave it for the donor/admin; still inside the gap: keep waiting
        d.availability = "Available"
        linked = db.query(User).filter(User.email == d.email).first()
        if linked and linked.availability == "Recently Donated":
            linked.availability = "Available"
        changed += 1
    if changed:
        db.commit()
    return changed
