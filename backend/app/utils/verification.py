import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from backend.app.config import settings

CODE_MINUTES = 15
MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60


def new_code() -> str:
    """6 digits from a cryptographically secure generator."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_code(user_id: str, code: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), f"{user_id}:{code}".encode(), hashlib.sha256).hexdigest()


def issue_code(user) -> str:
    """Create a fresh code on the user row (caller commits) and return the plain code to e-mail."""
    code = new_code()
    now = datetime.utcnow()
    user.verification_code_hash = hash_code(user.id, code)
    user.verification_expires = now + timedelta(minutes=CODE_MINUTES)
    user.verification_attempts = 0
    user.verification_sent_at = now
    return code


def check_code(user, code: str) -> bool:
    if not user.verification_code_hash or not user.verification_expires:
        return False
    if datetime.utcnow() > user.verification_expires:
        return False
    if (user.verification_attempts or 0) >= MAX_ATTEMPTS:
        return False
    return hmac.compare_digest(user.verification_code_hash, hash_code(user.id, code.strip()))
