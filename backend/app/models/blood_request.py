from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from backend.app.database import Base
from backend.app.models.donor import mask_phone

class BloodRequest(Base):
    __tablename__ = "blood_requests"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    patient_name = Column(String(128), nullable=False)
    blood_group = Column(String(8), index=True, nullable=False)
    units_needed = Column(Integer, default=1, nullable=False)
    hospital_name = Column(String(128), nullable=False)
    city = Column(String(64), default="Sylhet", index=True, nullable=False)
    urgency = Column(String(32), default="Urgent", index=True)  # Critical, Urgent, Normal
    deadline = Column(String(64), default="Within 4 hours")
    reason = Column(Text, default="Emergency transfusion required")
    status = Column(String(32), default="Pending", index=True)  # Pending, In Progress, Fulfilled, Cancelled
    contact_person = Column(String(128), default="Family Guardian")
    contact_phone = Column(String(64), nullable=False)
    responses_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True, index=True)

    def to_dict(self, include_contact: bool = True):
        return {
            "id": self.id,
            "userId": self.user_id,
            "patientName": self.patient_name,
            "bloodGroup": self.blood_group,
            "unitsNeeded": self.units_needed,
            "hospitalName": self.hospital_name,
            "city": self.city,
            "urgency": self.urgency,
            "deadline": self.deadline,
            "reason": self.reason,
            "status": self.status,
            "contactPerson": self.contact_person,
            "contactPhone": self.contact_phone if include_contact else mask_phone(self.contact_phone),
            "responsesCount": self.responses_count,
            "createdAt": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else "Just now",
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None
        }
