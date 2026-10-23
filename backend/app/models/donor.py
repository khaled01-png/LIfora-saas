from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey
from backend.app.database import Base

def mask_phone(phone):
    """+880 1711-234567 -> '••• ••• 567' (keeps the last 3 digits only)."""
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    return f"••• ••• {digits[-3:]}" if len(digits) >= 3 else "••••••"


def mask_email(email):
    if not email or "@" not in email:
        return "••••@••••"
    local, domain = email.split("@", 1)
    return f"{local[:1]}•••@{domain[:1]}•••"


class Donor(Base):
    __tablename__ = "donors"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(128), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    blood_group = Column(String(8), index=True, nullable=False)
    city = Column(String(64), default="Sylhet", index=True, nullable=False)
    location = Column(String(128), nullable=False)
    distance_km = Column(Float, default=0.0)
    travel_km = Column(Float, nullable=True)  # how far this donor says they can travel
    availability = Column(String(32), default="Available", index=True)  # Available, Unavailable, Recently Donated
    match_percentage = Column(Integer, default=0)
    last_donation_date = Column(String(32), default="Never")
    total_donations = Column(Integer, default=0)
    phone = Column(String(64), nullable=False)
    verified = Column(Boolean, default=True)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self, include_contact: bool = True):
        """Full record. Use include_contact=False for anything shown to the public."""
        return {
            "id": self.id,
            "userId": self.user_id,
            "name": self.name,
            "email": self.email if include_contact else mask_email(self.email),
            "bloodGroup": self.blood_group,
            "city": self.city,
            "location": self.location,
            "distanceKm": self.distance_km,
            "travelKm": self.travel_km,
            "availability": self.availability,
            "matchPercentage": self.match_percentage,
            "lastDonationDate": self.last_donation_date,
            "totalDonations": self.total_donations,
            "phone": self.phone if include_contact else mask_phone(self.phone),
            "verified": self.verified,
            "bio": self.bio or "Voluntary blood donor registered via LIFORA."
        }
