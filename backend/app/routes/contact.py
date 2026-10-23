from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.contact import ContactMessage
from backend.app.models.user import User
from backend.app.auth.dependencies import require_admin
from backend.app.utils.ids import new_id
from backend.app.utils.rate_limiter import rate_limit

router = APIRouter(prefix="/contact", tags=["Contact"])


class ContactIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    email: EmailStr
    message: str = Field(..., min_length=5, max_length=2000)


@router.post("", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(rate_limit(max_requests=5, window_seconds=3600))])
def send_contact_message(data: ContactIn, db: Session = Depends(get_db)):
    """Stores the message so an administrator can read it. Nothing is promised about reply times."""
    db.add(ContactMessage(
        id=new_id("msg"), name=data.name.strip(), email=str(data.email).lower().strip(),
        message=data.message.strip(),
    ))
    db.commit()
    return {"message": "Your message has been received."}


@router.get("/messages")
def list_messages(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    rows = db.query(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(500).all()
    return {"messages": [r.to_dict() for r in rows], "count": len(rows)}


@router.put("/messages/{id}/handled")
def mark_handled(id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    row = db.query(ContactMessage).filter(ContactMessage.id == id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Message not found")
    row.handled = True
    db.commit()
    return {"message": "Marked as handled", "item": row.to_dict()}
