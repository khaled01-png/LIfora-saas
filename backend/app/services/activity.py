"""Activity log: one row per important event, so an administrator can see who did what and when."""
import logging
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.models.activity import ActivityLog
from backend.app.models.user import User
from backend.app.utils.ids import new_id

log = logging.getLogger("lifora.activity")


def log_event(
    db: Session,
    event: str,
    actor: Optional[User] = None,
    subject_type: Optional[str] = None,
    subject_id: Optional[str] = None,
    detail: Optional[str] = None,
    commit: bool = True,
) -> None:
    """Never lets a logging problem break the real action. Contains no passwords, codes or tokens."""
    try:
        db.add(ActivityLog(
            id=new_id("act"),
            event=event,
            actor_id=actor.id if actor else None,
            actor_name=actor.name if actor else None,
            actor_email=actor.email if actor else None,
            subject_type=subject_type,
            subject_id=subject_id,
            detail=(detail or "")[:1000] or None,
        ))
        if commit:
            db.commit()
    except Exception:
        db.rollback()
        log.exception("Could not write activity log entry %s", event)
