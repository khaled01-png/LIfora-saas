from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from backend.app.database import Base


class ActivityLog(Base):
    """Who did what and when (sign-ups, requests, responses, donations, verification). Read by administrators only."""
    __tablename__ = "activity_logs"

    id = Column(String(64), primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    event = Column(String(64), index=True, nullable=False)  # e.g. account_created, request_created, donation_confirmed
    actor_id = Column(String(64), nullable=True, index=True)
    actor_name = Column(String(128), nullable=True)
    actor_email = Column(String(255), nullable=True)
    subject_type = Column(String(32), nullable=True)  # user, request, donor, donation
    subject_id = Column(String(64), nullable=True)
    detail = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "event": self.event,
            "actorId": self.actor_id,
            "actorName": self.actor_name,
            "actorEmail": self.actor_email,
            "subjectType": self.subject_type,
            "subjectId": self.subject_id,
            "detail": self.detail,
        }
