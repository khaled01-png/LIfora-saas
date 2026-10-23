from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, DateTime
from backend.app.database import Base

class AppNotification(Base):
    __tablename__ = "notifications"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    request_id = Column(String(64), nullable=True)
    response_id = Column(String(64), nullable=True)
    type = Column(String(64), nullable=False)  # request_match, donor_responded, response_status
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "requestId": self.request_id,
            "responseId": self.response_id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "isRead": self.is_read,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }
