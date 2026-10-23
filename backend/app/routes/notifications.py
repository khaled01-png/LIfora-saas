from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.notification import AppNotification
from backend.app.models.user import User
from backend.app.auth.dependencies import get_current_user, get_optional_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _target_user_id(requested: Optional[str], user: User) -> str:
    """Users only ever see their own notifications. Admins may inspect another user's."""
    if requested and requested != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="You can only view your own notifications.")
    return requested or user.id


@router.get("")
def get_notifications(
    unread: Optional[bool] = None,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user)
):
    if not optional_user:
        # Guests have no notifications; nothing is leaked.
        return {"notifications": [], "unreadCount": 0, "count": 0}

    target = _target_user_id(user_id, optional_user)
    query = db.query(AppNotification).filter(AppNotification.user_id == target)
    if unread:
        query = query.filter(AppNotification.is_read == False)  # noqa: E712

    unread_count = db.query(AppNotification).filter(
        AppNotification.user_id == target, AppNotification.is_read == False  # noqa: E712
    ).count()
    results = query.order_by(AppNotification.created_at.desc()).limit(200).all()

    return {
        "notifications": [n.to_dict() for n in results],
        "unreadCount": unread_count,
        "count": len(results)
    }


@router.get("/unread-count")
def get_unread_count(
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
    optional_user: Optional[User] = Depends(get_optional_user)
):
    if not optional_user:
        return {"userId": "guest", "unreadCount": 0}

    target = _target_user_id(user_id, optional_user)
    count = db.query(AppNotification).filter(
        AppNotification.user_id == target, AppNotification.is_read == False  # noqa: E712
    ).count()
    return {"userId": target, "unreadCount": count}


@router.put("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(AppNotification).filter(
        AppNotification.user_id == current_user.id,
        AppNotification.is_read == False  # noqa: E712
    ).update({AppNotification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read", "unreadCount": 0}


@router.put("/{id}/read")
def mark_read(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(AppNotification).filter(
        AppNotification.id == id, AppNotification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    db.commit()
    db.refresh(notif)

    remaining = db.query(AppNotification).filter(
        AppNotification.user_id == current_user.id,
        AppNotification.is_read == False  # noqa: E712
    ).count()
    return {
        "message": "Notification marked as read",
        "notification": notif.to_dict(),
        "unreadCount": remaining
    }


@router.delete("/{id}")
def delete_notification(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(AppNotification).filter(
        AppNotification.id == id, AppNotification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted successfully"}
