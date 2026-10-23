import datetime
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from backend.app.config import settings

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.datetime.now(datetime.timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("typ"):  # special-purpose tokens (e.g. password reset) are not login tokens
            return None
        return payload
    except (jwt.PyJWTError, Exception):
        return None


def create_reset_token(user_id: str, hashed_password: str) -> str:
    """Single-use: bound to the current password hash, so it stops working once the password changes."""
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": user_id,
        "typ": "reset",
        "pw": hashed_password[-16:],
        "iat": now,
        "exp": now + datetime.timedelta(minutes=settings.RESET_TOKEN_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_reset_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload if payload.get("typ") == "reset" else None
    except Exception:
        return None
