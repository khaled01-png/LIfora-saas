from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.auth.security import decode_access_token
from backend.app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def _is_deleted(user: Optional[User]) -> bool:
    """Deleted accounts are anonymised (not removed), so their old tokens must stop working."""
    return bool(user) and str(user.email or "").endswith("@deleted.invalid")

def _session_valid(payload: dict, user: Optional[User]) -> bool:
    """A login token carries the tail of the password hash it was issued for ("pv").
    After a password reset (or account deletion) the hash changes, so every older session stops working.
    Tokens without "pv" (older ones) are still accepted until they expire."""
    if not user:
        return False
    pv = payload.get("pv")
    return pv is None or pv == (user.hashed_password or "")[-12:]


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials or not credentials.credentials:
        return None
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if _is_deleted(user) or not _session_valid(payload, user):
        return None
    return user

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user or _is_deleted(user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not _session_valid(payload, user):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has ended. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required."
        )
    return current_user

def require_donor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {"donor", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Donor role required."
        )
    return current_user

def require_requester(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {"requester", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Requester role required."
        )
    return current_user


def get_member(user: User = Depends(get_current_user)) -> User:
    """A verified account that has finished onboarding (administrators always qualify)."""
    if user.role == "admin":
        return user
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email address first.")
    if user.role == "pending" or not user.profile_completed:
        raise HTTPException(status_code=403, detail="Please complete your profile first.")
    return user


def require_roles(*roles: str):
    """Role-based access: donors and requesters each get their own features (administrators get all)."""
    def dependency(user: User = Depends(get_member)) -> User:
        if user.role == "admin" or user.role in roles:
            return user
        raise HTTPException(status_code=403, detail=f"This feature is only for {' / '.join(roles)} accounts.")
    return dependency
