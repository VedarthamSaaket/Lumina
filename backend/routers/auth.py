# backend/routers/auth.py
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from models.database import get_db, User, PendingSignup, utcnow
from utils.auth import hash_password, verify_password, create_access_token, get_current_user
from middleware.security import record_failed_login, _get_client_ip
from email_service import send_verification_email, send_password_reset_email
from config import settings, logger

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Session cookie lifetimes (seconds)
REMEMBER_MAX_AGE = 60 * 60 * 24 * 30   # 30 days when "remember me" is checked
SESSION_MAX_AGE  = 60 * 60 * 24 * 7    # 7 days otherwise
# Max wrong code guesses before a pending signup / reset code is invalidated
MAX_CODE_ATTEMPTS = 6


# ── Schemas ───────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    age_confirmed: bool
    full_name: str | None = None
    age: int | None = None
    gender: str | None = None


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str
    remember: bool = False


class ResendCodeRequest(BaseModel):
    email: EmailStr


class SigninRequest(BaseModel):
    email: EmailStr
    password: str
    remember: bool = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    password: str


# ── Helpers ───────────────────────────────────────────────────────────────────
def _validate_password_strength(password: str) -> None:
    """Enforce basic password strength rules."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if len(password) > 128:
        raise HTTPException(status_code=400, detail="Password is too long")
    # Require at least one digit or special char to discourage trivial passwords
    has_digit   = any(c.isdigit()   for c in password)
    has_special = any(not c.isalnum() for c in password)
    has_upper   = any(c.isupper()   for c in password)
    if not (has_digit or has_special) and not has_upper:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one number, special character, or uppercase letter",
        )


def _generate_code() -> str:
    """Cryptographically random 6-digit code (zero-padded)."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _set_auth_cookie(response: Response, token: str, remember: bool) -> None:
    response.set_cookie(
        key="access_token", value=token,
        httponly=True, samesite="lax",
        secure=settings.ENFORCE_HTTPS,
        max_age=REMEMBER_MAX_AGE if remember else SESSION_MAX_AGE,
    )


# ── Signup → email verification (hard gate) ───────────────────────────────────
@router.post("/signup")
def signup(data: SignupRequest, request: Request, db: Session = Depends(get_db)):
    """Step 1 of signup. Does NOT create an account — stores a pending signup
    and emails a 6-digit code. The User row is created only at /verify-email."""
    if not data.age_confirmed:
        raise HTTPException(status_code=400, detail="Age confirmation required (16+)")

    _validate_password_strength(data.password)

    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        # Don't reveal that the email is already registered
        raise HTTPException(status_code=400, detail="Unable to create account with that email")

    code   = _generate_code()
    expiry = utcnow() + timedelta(minutes=settings.EMAIL_CODE_TTL_MINUTES)

    # Upsert the pending signup (re-attempt / different details overwrite the old one)
    pending = db.query(PendingSignup).filter(PendingSignup.email == data.email).first()
    if not pending:
        pending = PendingSignup(email=data.email)
        db.add(pending)

    pending.password_hash = hash_password(data.password)
    pending.age_confirmed = data.age_confirmed
    pending.full_name     = data.full_name
    pending.age           = data.age
    pending.gender        = data.gender
    pending.code_hash     = hash_password(code)
    pending.expires_at    = expiry
    pending.attempts      = 0
    db.commit()

    if not send_verification_email(data.email, code):
        # SMTP down → roll the pending row back so the user can retry cleanly.
        db.delete(pending)
        db.commit()
        raise HTTPException(
            status_code=500,
            detail="Couldn't send the verification email. Please try again in a moment.",
        )

    return {
        "message": "Verification code sent",
        "email": data.email,
        "expires_in_minutes": settings.EMAIL_CODE_TTL_MINUTES,
    }


@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest, response: Response, db: Session = Depends(get_db)):
    """Step 2 of signup. Confirms the code, creates the real account, signs in."""
    pending = db.query(PendingSignup).filter(PendingSignup.email == data.email).first()
    if not pending:
        raise HTTPException(status_code=400, detail="No pending verification for this email. Please sign up again.")

    if utcnow() > pending.expires_at:
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=400, detail="This code has expired. Please request a new one.")

    if pending.attempts >= MAX_CODE_ATTEMPTS:
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=429, detail="Too many incorrect attempts. Please sign up again.")

    if not verify_password(data.code.strip(), pending.code_hash):
        pending.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect code. Please check and try again.")

    # Guard against a race where the email got registered between steps
    if db.query(User).filter(User.email == data.email).first():
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=400, detail="Unable to create account with that email")

    user = User(
        email          = pending.email,
        password_hash  = pending.password_hash,   # already hashed
        age_confirmed  = pending.age_confirmed,
        full_name      = pending.full_name,
        age            = pending.age,
        gender         = pending.gender,
        email_verified = True,
    )
    db.add(user)
    db.delete(pending)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    _set_auth_cookie(response, token, data.remember)
    return {"message": "Account verified", "user_id": user.id, "access_token": token}


@router.post("/resend-code")
def resend_code(data: ResendCodeRequest, db: Session = Depends(get_db)):
    """Re-issue a verification code for a pending signup."""
    pending = db.query(PendingSignup).filter(PendingSignup.email == data.email).first()
    if not pending:
        # Don't leak whether a pending signup exists
        return {"message": "If a pending signup exists, a new code has been sent."}

    code = _generate_code()
    pending.code_hash  = hash_password(code)
    pending.expires_at = utcnow() + timedelta(minutes=settings.EMAIL_CODE_TTL_MINUTES)
    pending.attempts   = 0
    db.commit()

    send_verification_email(data.email, code)
    return {"message": "If a pending signup exists, a new code has been sent."}


# ── Sign in / out ─────────────────────────────────────────────────────────────
@router.post("/signin")
def signin(data: SigninRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    ip   = _get_client_ip(request)
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.password_hash):
        record_failed_login(ip)
        # Generic message — don't reveal whether the email exists
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id})
    _set_auth_cookie(response, token, data.remember)
    return {"message": "Signed in", "user_id": user.id, "access_token": token}


@router.post("/signout")
def signout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Signed out"}


# ── Forgot / reset password (6-digit code) ────────────────────────────────────
@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Email a reset code. Always returns a generic success so the endpoint
    can't be used to enumerate which emails are registered."""
    generic = {
        "message": "If an account exists for that email, a reset code has been sent.",
        "expires_in_minutes": settings.EMAIL_CODE_TTL_MINUTES,
    }
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return generic

    code = _generate_code()
    user.reset_code_hash    = hash_password(code)
    user.reset_code_expires = utcnow() + timedelta(minutes=settings.EMAIL_CODE_TTL_MINUTES)
    db.commit()

    if not send_password_reset_email(data.email, code):
        logger.error("[AUTH] failed to send reset email to %s", data.email)
        # Still generic to the caller — don't surface SMTP state on this endpoint.
    return generic


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    # Same generic failure regardless of which check fails (no account-state leak)
    invalid = HTTPException(status_code=400, detail="Invalid or expired reset code")

    if not user or not user.reset_code_hash or not user.reset_code_expires:
        raise invalid
    if utcnow() > user.reset_code_expires:
        user.reset_code_hash = None
        user.reset_code_expires = None
        db.commit()
        raise invalid
    if not verify_password(data.code.strip(), user.reset_code_hash):
        raise invalid

    _validate_password_strength(data.password)

    user.password_hash      = hash_password(data.password)
    user.reset_code_hash    = None
    user.reset_code_expires = None
    db.commit()
    return {"message": "Password updated. You can now sign in."}


# ── Current user ──────────────────────────────────────────────────────────────
@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id":            current_user.id,
        "email":         current_user.email,
        "theme":         current_user.theme,
        "age_confirmed": current_user.age_confirmed,
        "created_at":    current_user.created_at,
        "full_name":     current_user.full_name,
        "age":           current_user.age,
        "gender":        current_user.gender,
    }
