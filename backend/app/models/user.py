from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Float
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(128), nullable=False)
    role = Column(String(32), default="pending", nullable=False)  # pending (no role chosen yet), donor, requester, admin
    blood_group = Column(String(8), nullable=True)
    city = Column(String(64), default="Sylhet", nullable=False)
    location = Column(String(128), nullable=True)
    phone = Column(String(64), nullable=True)
    total_donations = Column(Integer, default=0)
    last_donation = Column(String(32), nullable=True)
    availability = Column(String(32), default="Available")
    created_at = Column(DateTime, default=datetime.utcnow)

    # email verification (the 6-digit code is never stored, only a keyed hash of it)
    email_verified = Column(Boolean, default=False, nullable=False)
    verification_code_hash = Column(String(128), nullable=True)
    verification_expires = Column(DateTime, nullable=True)
    verification_attempts = Column(Integer, default=0, nullable=False)
    verification_sent_at = Column(DateTime, nullable=True)
    # Password chosen at sign-up while the e-mail is still unverified. It only becomes the real password
    # when the emailed code is entered, so nobody can change the password of an address they do not own.
    pending_password_hash = Column(String(255), nullable=True)

    # onboarding profile
    age = Column(Integer, nullable=True)
    radius_km = Column(Float, nullable=True)  # how far the person is willing to travel / search
    profile_completed = Column(Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "bloodGroup": self.blood_group,
            "city": self.city,
            "location": self.location,
            "phone": self.phone,
            "totalDonations": self.total_donations,
            "lastDonation": self.last_donation,
            "availability": self.availability,
            "age": self.age,
            "radiusKm": self.radius_km,
            "emailVerified": bool(self.email_verified),
            "profileCompleted": bool(self.profile_completed),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
