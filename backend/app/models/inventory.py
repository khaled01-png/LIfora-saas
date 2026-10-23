from sqlalchemy import Column, Integer, String
from backend.app.database import Base

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    blood_group = Column(String(8), unique=True, index=True, nullable=False)
    available_units = Column(Integer, default=0, nullable=False)
    reserved_units = Column(Integer, default=0, nullable=False)
    status = Column(String(32), default="Available")  # Critical, High Demand, Available, Surplus
    last_updated = Column(String(64), default="Just now")

    def to_dict(self):
        return {
            "bloodGroup": self.blood_group,
            "availableUnits": self.available_units,
            "reservedUnits": self.reserved_units,
            "status": self.status,
            "lastUpdated": self.last_updated
        }
