import json
from sqlalchemy import Column, String, Integer, Float, Boolean, Text
from backend.app.database import Base

class BloodCenter(Base):
    __tablename__ = "blood_centers"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    category = Column(String(64), default="Medical College Hospital")
    address = Column(String(255), nullable=False)
    city = Column(String(64), default="Sylhet", index=True, nullable=False)
    location = Column(String(128), default="Sylhet")
    phone = Column(String(64), nullable=False)
    emergency_phone = Column(String(64), nullable=False)
    email = Column(String(255), nullable=False)
    open_hours = Column(String(128), default="Call to confirm")
    emergency_24x7 = Column(Boolean, default=False)
    distance_km = Column(Float, default=0.0)
    available_units = Column(Integer, default=0)
    blood_groups_available = Column(Text, default="[]")  # JSON string
    coordinates_lat = Column(Float, nullable=True)
    coordinates_lng = Column(Float, nullable=True)
    services = Column(Text, default="[]")  # JSON string
    rating = Column(Float, default=0.0)
    total_reviews = Column(Integer, default=0)

    def to_dict(self):
        try:
            bg_list = json.loads(self.blood_groups_available) if self.blood_groups_available else []
        except Exception:
            bg_list = []
        try:
            svc_list = json.loads(self.services) if self.services else []
        except Exception:
            svc_list = []

        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "address": self.address,
            "city": self.city,
            "location": self.location,
            "phone": self.phone,
            "emergencyPhone": self.emergency_phone,
            "email": self.email,
            "openHours": self.open_hours,
            "emergency24x7": self.emergency_24x7,
            "distanceKm": self.distance_km,
            "availableUnits": self.available_units,
            "bloodGroupsAvailable": bg_list,
            "coordinates": {
                "lat": self.coordinates_lat,
                "lng": self.coordinates_lng
            },
            "services": svc_list,
            "rating": self.rating,
            "totalReviews": self.total_reviews
        }
