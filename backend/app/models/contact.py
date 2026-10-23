from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime
from backend.app.database import Base


class ContactMessage(Base):
    """Messages sent through the website contact form (read by administrators)."""
    __tablename__ = "contact_messages"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    email = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    handled = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "message": self.message,
            "handled": self.handled,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
