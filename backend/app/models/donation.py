from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime
from backend.app.database import Base

class DonationRecord(Base):
    __tablename__ = "donation_records"

    id = Column(String(64), primary_key=True, index=True)
    donor_id = Column(String(64), nullable=True)
    donor_name = Column(String(128), nullable=False)
    blood_group = Column(String(8), nullable=False)
    center_name = Column(String(128), nullable=False)
    date = Column(String(32), nullable=False)
    units = Column(Integer, default=1, nullable=False)
    status = Column(String(32), default="Completed")
    request_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "donorId": self.donor_id,
            "donorName": self.donor_name,
            "bloodGroup": self.blood_group,
            "centerName": self.center_name,
            "date": self.date,
            "units": self.units,
            "status": self.status,
            "requestId": self.request_id
        }
