import secrets
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models.user import User
from backend.app.models.donor import Donor
from backend.app.models.notification import AppNotification
from backend.app.schemas.auth import (
    LoginRequest, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest,
    VerifyEmailRequest, ResendCodeRequest, OnboardingRequest, ProfileUpdateRequest, SwitchRoleRequest,
)
from backend.app.utils.verification import (
    issue_code, check_code, CODE_MINUTES, MAX_ATTEMPTS, RESEND_COOLDOWN_SECONDS,
)
from backend.app.auth.security import (
    verify_password, get_password_hash, create_access_token, create_reset_token, decode_reset_token
)
from backend.app.utils.email import send_email, email_configured
from backend.app.config import settings as _settings
from backend.app.auth.dependencies import get_current_user, bearer_scheme
from backend.app.auth.security import decode_access_token
from backend.app.services.activity import log_event
from backend.app.utils.ids import new_id
from backend.app.utils.rate_limiter import rate_limit, limiter, client_ip

router = APIRouter(prefix="/auth", tags=["Authentication"])

DEMO_PASSWORDS = {"lifora2026", "LiforaDemo2026!", "LiforaDonor2026!", "LiforaReq2026!", "LiforaAdmin2026!"}
# A valid bcrypt hash of a random value, used to keep login timing the same for unknown emails.
_DUMMY_HASH = get_password_hash(secrets.token_urlsafe(16))


def _token_for(user: User) -> str:
    return create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "name": user.name,
        "pv": (user.hashed_password or "")[-12:],
    })


def _send_verification_email(user: User, code: str) -> bool:
    return send_email(
        user.email,
        "Your LIFORA verification code",
        f"Hello {user.name},\n\nYour LIFORA verification code is: {code}\n\n"
        f"It expires in {CODE_MINUTES} minutes. If you did not create a LIFORA account, ignore this email.",
    )


def _verification_response(user: User, code: str, sent: bool) -> dict:
    body = {
        "message": "We sent a 6-digit verification code to your email address." if sent
                   else "Your verification code could not be emailed.",
        "needsVerification": True,
        "email": user.email,
        "emailSent": sent,
        "expiresInMinutes": CODE_MINUTES,
    }
    # Development convenience only: never returned in production.
    if not sent and not _settings.IS_PRODUCTION and not email_configured():
        body["devCode"] = code
    return body


@router.post("/register", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60))])
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Step 1: name, email, password. The account stays unusable until the emailed code is entered."""
    email_clean = str(data.email).lower().strip()

    if _settings.IS_PRODUCTION and not email_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sign-up is temporarily unavailable because email delivery is not configured.",
        )

    user = db.query(User).filter(User.email == email_clean).first()
    if user and user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user account with this email address already exists.",
        )

    is_new = user is None
    if user:  # an earlier sign-up that never verified
        now = datetime.utcnow()
        if user.verification_sent_at and now - user.verification_sent_at < timedelta(seconds=RESEND_COOLDOWN_SECONDS):
            # A code went out a moment ago: change nothing (no new password, no new code) and say so.
            return {
                "message": "A verification code was sent a moment ago. Please wait a minute before asking for another.",
                "needsVerification": True,
                "email": user.email,
                "emailSent": True,
                "expiresInMinutes": CODE_MINUTES,
            }
        # The password typed now is only KEPT until the person proves they own the address by entering the code.
        # The old password stays in force until then, so nobody can take over an address they do not own.
        user.name = data.name.strip()
        user.pending_password_hash = get_password_hash(data.password)
    else:
        user = User(
            id=new_id("user"),
            email=email_clean,
            hashed_password=get_password_hash(data.password),
            name=data.name.strip(),
            role="pending",
            city="Sylhet",
            availability="Available",
            email_verified=False,
            profile_completed=False,
        )
        db.add(user)
        db.flush()

    code = issue_code(user)
    db.commit()
    if is_new:
        log_event(db, "signup_started", None, "user", user.id, f"{user.name} <{user.email}> started sign-up")
    sent = _send_verification_email(user, code)
    return _verification_response(user, code, sent)


@router.post("/verify-email", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    email_clean = str(data.email).lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    invalid = HTTPException(status_code=400, detail="This code is invalid or has expired. Please request a new one.")
    if not user or user.email_verified:
        raise invalid
    if not check_code(user, data.code):
        user.verification_attempts = (user.verification_attempts or 0) + 1
        db.commit()
        raise invalid

    user.email_verified = True
    user.verification_code_hash = None
    user.verification_expires = None
    user.verification_attempts = 0
    if user.pending_password_hash:  # the password typed at the latest sign-up becomes real only now
        user.hashed_password = user.pending_password_hash
        user.pending_password_hash = None
    db.commit()
    log_event(db, "email_verified", user, "user", user.id, "Account created and e-mail verified")
    return {
        "message": "Email verified. Welcome to LIFORA!",
        "user": user.to_dict(),
        "token": _token_for(user),
    }


@router.post("/resend-code", dependencies=[Depends(rate_limit(max_requests=10, window_seconds=3600))])
def resend_code(data: ResendCodeRequest, db: Session = Depends(get_db)):
    """Same answer whether or not the address has an account (no account discovery)."""
    email_clean = str(data.email).lower().strip()
    generic = {"message": "If this address is waiting for verification, a new code has been sent.",
               "needsVerification": True, "email": email_clean}
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or user.email_verified:
        return generic
    if user.verification_sent_at and datetime.utcnow() - user.verification_sent_at < timedelta(seconds=RESEND_COOLDOWN_SECONDS):
        return generic
    code = issue_code(user)
    db.commit()
    sent = _send_verification_email(user, code)
    if not sent and not _settings.IS_PRODUCTION and not email_configured():
        generic["devCode"] = code
    return generic


def _apply_profile(user: User, db: Session, *, role=None, bloodGroup=None, age=None, city=None,
                   location=None, radiusKm=None, phone=None):
    effective_role = role or user.role
    effective_age = age if age is not None else user.age
    if effective_role == "donor" and effective_age is not None and not (18 <= effective_age <= 65):
        raise HTTPException(status_code=422, detail="Donors must be between 18 and 65 years old.")

    if role:
        user.role = role
    if bloodGroup:
        user.blood_group = bloodGroup
    if age is not None:
        user.age = age
    if city:
        user.city = city.strip()
    if location:
        user.location = location.strip()
    if radiusKm is not None:
        user.radius_km = radiusKm
    if phone is not None:
        user.phone = phone.strip()
    user.profile_completed = bool(user.role in ("donor", "requester", "admin") and user.blood_group and user.age
                                  and user.city and user.phone and user.radius_km)

    donor = db.query(Donor).filter(Donor.user_id == user.id).first()
    if user.role == "donor":
        if not donor:
            donor = Donor(
                id=new_id("donor"), user_id=user.id, name=user.name, email=user.email,
                blood_group=user.blood_group or "O+", city=user.city, location=user.location or user.city,
                distance_km=0.0, availability="Available", match_percentage=0, last_donation_date="Never",
                total_donations=0, phone=user.phone or "", verified=False,
                bio="Voluntary blood donor registered via LIFORA.",
            )
            db.add(donor)
        donor.name = user.name
        donor.blood_group = user.blood_group or donor.blood_group
        donor.city = user.city
        donor.location = user.location or user.city
        donor.phone = user.phone or donor.phone
        donor.travel_km = user.radius_km
    db.commit()
    db.refresh(user)


@router.post("/onboarding")
def onboarding(data: OnboardingRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Step 3 (after e-mail verification): choose Donor or Requester and fill the profile."""
    if not current_user.email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email address first.")
    if current_user.role == "admin":
        raise HTTPException(status_code=400, detail="Administrator accounts do not use this step.")
    _apply_profile(current_user, db, role=data.role, bloodGroup=data.bloodGroup, age=data.age, city=data.city,
                   location=data.location, radiusKm=data.radiusKm, phone=data.phone)
    log_event(db, "profile_completed", current_user, "user", current_user.id,
              f"Chose {data.role}, blood group {data.bloodGroup}, {data.city}")
    return {"message": "Your profile is ready.", "user": current_user.to_dict()}


@router.post("/switch-role")
def switch_role(data: SwitchRoleRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """One account can use both dashboards. Switching keeps the saved profile, so nothing is asked again."""
    if not current_user.email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email address first.")
    if current_user.role == "admin":
        raise HTTPException(status_code=400, detail="Administrator accounts cannot switch roles.")
    if current_user.role == "pending" or not current_user.profile_completed:
        raise HTTPException(status_code=403, detail="Please complete your profile first.")
    _apply_profile(current_user, db, role=data.role)
    log_event(db, "role_switched", current_user, "user", current_user.id, f"Now using LIFORA as a {data.role}")
    return {"message": f"You are now using LIFORA as a {data.role}.", "user": current_user.to_dict()}


@router.put("/profile")
def update_profile(data: ProfileUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email address first.")
    _apply_profile(current_user, db, bloodGroup=data.bloodGroup, age=data.age, city=data.city,
                   location=data.location, radiusKm=data.radiusKm, phone=data.phone)
    return {"message": "Profile updated.", "user": current_user.to_dict()}


@router.post("/login", dependencies=[Depends(rate_limit(max_requests=20, window_seconds=60))])
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email_clean = str(data.email).lower().strip()

    # Brute-force guard per account (in addition to the per-IP limit above).
    if not limiter.is_allowed(f"login-account:{email_clean}", max_requests=10, window_seconds=900):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again in a few minutes.",
        )

    user = db.query(User).filter(User.email == email_clean).first()
    if user:
        valid = verify_password(data.password, user.hashed_password)
        # Demo passwords only work when explicitly enabled in a non-production environment.
        if not valid and settings.ALLOW_DEMO_PASSWORDS and data.password in DEMO_PASSWORDS:
            valid = True
    else:
        verify_password(data.password, _DUMMY_HASH)  # constant-time-ish response
        valid = False

    if not valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.email_verified:
        return JSONResponse(status_code=403, content={
            "detail": "Please verify your email address first. Enter the 6-digit code we sent you.",
            "needsVerification": True, "email": user.email,
        })

    return {
        "message": "Authentication successful",
        "user": user.to_dict(),
        "token": _token_for(user),
    }


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    """Also hands out a fresh token when the current one is more than a day old, so an active person stays logged in."""
    body = {"user": current_user.to_dict()}
    payload = decode_access_token(credentials.credentials) if credentials else None
    issued = payload.get("iat") if payload else None
    if issued and time.time() - float(issued) > 86400:
        body["token"] = _token_for(current_user)
    return body


@router.post("/logout")
def logout():
    # Tokens are stateless; the client discards its token. Keep expiry short for sensitive use.
    return {"message": "Successfully logged out"}


@router.delete("/me", dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60))])
def delete_my_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Right-to-erasure: anonymise the account and remove personal data.

    Records that other users rely on (requests, donation history) are kept without personal data.
    """
    if current_user.role == "admin":
        raise HTTPException(status_code=400, detail="Administrator accounts cannot be self-deleted.")

    donor = db.query(Donor).filter(Donor.user_id == current_user.id).first()
    if donor is None:
        donor = db.query(Donor).filter(Donor.email == current_user.email).first()
    if donor:
        donor.name = "Deleted donor"
        donor.email = f"deleted-{donor.id}@deleted.invalid"
        donor.phone = ""
        donor.bio = None
        donor.user_id = None
        donor.availability = "Unavailable"
        donor.verified = False

    db.query(AppNotification).filter(AppNotification.user_id == current_user.id).delete(synchronize_session=False)

    current_user.name = "Deleted user"
    current_user.email = f"deleted-{current_user.id}@deleted.invalid"
    current_user.phone = None
    current_user.location = None
    current_user.hashed_password = get_password_hash(secrets.token_urlsafe(32))
    current_user.availability = "Unavailable"
    db.commit()
    log_event(db, "account_deleted", None, "user", current_user.id, "An account was deleted by its owner")
    return {"message": "Your account and personal data have been removed."}


@router.post("/forgot-password", dependencies=[Depends(rate_limit(max_requests=5, window_seconds=3600))])
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Always answers the same way so it cannot be used to discover which emails have accounts."""
    email_clean = str(data.email).lower().strip()
    if limiter.is_allowed(f"reset-account:{email_clean}", max_requests=3, window_seconds=3600):
        user = db.query(User).filter(User.email == email_clean).first()
        if user and not user.email.endswith("@deleted.invalid"):
            log_event(db, "password_reset_requested", None, "user", user.id, "A password reset e-mail was requested")
            token = create_reset_token(user.id, user.hashed_password)
            link = f"{settings.FRONTEND_URL}/?reset_token={token}"
            send_email(
                user.email,
                "Reset your LIFORA password",
                f"Hello {user.name},\n\nUse this link to choose a new password "
                f"(valid for {settings.RESET_TOKEN_MINUTES} minutes):\n{link}\n\n"
                "If you did not ask for this, you can ignore this email.",
            )
    return {
        "message": "If an account exists for this email, a reset link has been sent.",
        "emailConfigured": email_configured(),
    }


@router.post("/reset-password", dependencies=[Depends(rate_limit(max_requests=10, window_seconds=3600))])
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload = decode_reset_token(data.token)
    user = db.query(User).filter(User.id == payload["sub"]).first() if payload else None
    if not user or payload.get("pw") != user.hashed_password[-16:]:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")
    user.hashed_password = get_password_hash(data.newPassword)
    db.commit()
    log_event(db, "password_reset_done", None, "user", user.id, "Password changed with a reset link")
    return {"message": "Your password has been updated. You can now log in."}
