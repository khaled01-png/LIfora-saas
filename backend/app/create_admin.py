"""Create (or promote) an administrator from the command line.

Usage (never put the password in source code or git):
    ADMIN_EMAIL=you@example.org ADMIN_PASSWORD='a-long-random-password' \
        python -m backend.app.create_admin
"""
import os
import sys

from backend.app.database import Base, engine, SessionLocal
from backend.app.models.user import User
from backend.app.auth.security import get_password_hash
from backend.app.utils.ids import new_id


def main() -> int:
    email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "")
    name = os.getenv("ADMIN_NAME", "LIFORA Administrator")
    if not email or "@" not in email:
        print("ADMIN_EMAIL is required.")
        return 1
    if len(password) < 12:
        print("ADMIN_PASSWORD must be at least 12 characters.")
        return 1

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.role = "admin"
            user.email_verified = True
            user.profile_completed = True
            user.hashed_password = get_password_hash(password)
            print(f"Existing user {email} promoted to admin and password reset.")
        else:
            db.add(User(
                id=new_id("user"), email=email, hashed_password=get_password_hash(password),
                name=name, role="admin", city="Sylhet", availability="Available",
                email_verified=True, profile_completed=True,
            ))
            print(f"Admin {email} created.")
        db.commit()
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
