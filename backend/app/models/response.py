from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint
from backend.app.database import Base

class BloodRequestResponse(Base):
    __tablename__ = "request_responses"
    __table_args__ = (UniqueConstraint("request_id", "donor_id", name="uq_response_request_donor"),)

    id = Column(String(64), primary_key=True, index=True)
    request_id = Column(String(64), ForeignKey("blood_requests.id", ondelete="CASCADE"), index=True, nullable=False)
    donor_id = Column(String(64), ForeignKey("donors.id", ondelete="CASCADE"), index=True, nullable=False)
    requester_id = Column(String(64), nullable=True)
    status = Column(String(32), default="accepted")  # accepted, booked, claimed (donor says "I donated"), completed, declined
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Set when the donor presses "I donated". The requester confirms it, or it is confirmed automatically later.
    donor_claimed_at = Column(DateTime, nullable=True, index=True)

    def to_dict(self, donor_dict=None):
        data = {
            "id": self.id,
            "requestId": self.request_id,
            "donorId": self.donor_id,
            "requesterId": self.requester_id,
            "status": self.status,
            "message": self.message,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "donorClaimedAt": self.donor_claimed_at.isoformat() if self.donor_claimed_at else None,
        }
        if donor_dict:
            data["donor"] = donor_dict
        return data
