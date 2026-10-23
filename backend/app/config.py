import os
import secrets
from typing import List


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _csv(name: str, default: str = "") -> List[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "LIFORA Blood Coordination Engine")
    VERSION: str = "1.1.0"
    API_PREFIX: str = "/api"

    # "production" turns on strict safety checks (required secret, no demo data, no docs).
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").strip().lower()
    IS_PRODUCTION: bool = ENVIRONMENT == "production"

    # Database URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./lifora.db")
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # JWT security: the secret MUST come from the environment in production.
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    if not SECRET_KEY:
        if IS_PRODUCTION:
            raise RuntimeError(
                "SECRET_KEY is required when ENVIRONMENT=production. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
            )
        # Development only: random per-process key (tokens are invalidated on restart).
        SECRET_KEY = secrets.token_urlsafe(64)
    if IS_PRODUCTION and len(SECRET_KEY) < 32:
        raise RuntimeError("SECRET_KEY must be at least 32 characters in production.")

    ALGORITHM: str = "HS256"
    # People stay logged in: 30 days by default. A password reset ends all older sessions (see auth/dependencies.py).
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))

    # CORS: explicit allow-list. Wildcard is refused in production.
    CORS_ORIGINS: List[str] = _csv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
    )
    if IS_PRODUCTION and ("*" in CORS_ORIGINS or not _csv("ALLOWED_ORIGINS")):
        raise RuntimeError(
            "Set ALLOWED_ORIGINS to your exact frontend origin(s) in production "
            "(for example https://lifora-rouge.vercel.app). Wildcards are not allowed."
        )

    # Demo data / demo passwords are NEVER enabled in production.
    # Off by default everywhere: no made-up people. Set SEED_DEMO_DATA=true only for automated tests.
    SEED_DEMO_DATA: bool = _bool("SEED_DEMO_DATA", False) and not IS_PRODUCTION
    ALLOW_DEMO_PASSWORDS: bool = _bool("ALLOW_DEMO_PASSWORDS", False) and not IS_PRODUCTION

    # Behind a reverse proxy (Render, Railway, Fly) the real client IP is in X-Forwarded-For.
    TRUST_PROXY: bool = _bool("TRUST_PROXY", IS_PRODUCTION)

    # How many reverse proxies sit in front of the app (Render/Railway/Fly = 1). Used to pick the real client IP.
    TRUSTED_PROXY_COUNT: int = int(os.getenv("TRUSTED_PROXY_COUNT", "1"))

    RATE_LIMIT_ENABLED: bool = _bool("RATE_LIMIT_ENABLED", True)

    # A donor presses "I donated"; if the requester does not answer within this many hours it counts as donated.
    AUTO_CONFIRM_HOURS: int = int(os.getenv("AUTO_CONFIRM_HOURS", "24"))

    # A donor needs at least this many confirmed donations before an administrator may verify them.
    MIN_DONATIONS_TO_VERIFY: int = int(os.getenv("MIN_DONATIONS_TO_VERIFY", "5"))

    # Most donors e-mailed for one new blood request (keeps one request from flooding the mail account).
    MAX_REQUEST_EMAILS: int = int(os.getenv("MAX_REQUEST_EMAILS", "200"))

    # Minimum days between whole-blood donations before a donor can be matched again.
    DONATION_COOLDOWN_DAYS: int = int(os.getenv("DONATION_COOLDOWN_DAYS", "120"))

    # Database connection pool (ignored for SQLite).
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))

    # Password-reset e-mails. If SMTP_HOST is empty, e-mail is "not configured" and the UI says so honestly.
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "LIFORA <no-reply@lifora.local>")
    RESET_TOKEN_MINUTES: int = int(os.getenv("RESET_TOKEN_MINUTES", "30"))


settings = Settings()
