# backend/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from models.database import get_db, User
from utils.auth import hash_password, verify_password, create_access_token, get_current_user
from middleware.security import record_failed_login, _get_client_ip

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    age_confirmed: bool
    full_name: str | None = None
    age: int | None = None
    gender: str | None = None


class SigninRequest(BaseModel):
    email: EmailStr
    password: str


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


@router.post("/signup")
def signup(data: SignupRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    if not data.age_confirmed:
        raise HTTPException(status_code=400, detail="Age confirmation required (16+)")

    _validate_password_strength(data.password)

    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        # Don't reveal that the email is already registered
        raise HTTPException(status_code=400, detail="Unable to create account with that email")

    user = User(
        email         = data.email,
        password_hash = hash_password(data.password),
        age_confirmed = data.age_confirmed,
        full_name     = data.full_name,
        age           = data.age,
        gender        = data.gender,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    response.set_cookie(
        key="access_token", value=token,
        httponly=True, samesite="lax",
        secure=True,          # Set to True in production (HTTPS)
        max_age=604800,
    )
    return {"message": "Account created", "user_id": user.id, "access_token": token}


@router.post("/signin")
def signin(data: SigninRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    ip   = _get_client_ip(request)
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.password_hash):
        record_failed_login(ip)
        # Generic message — don't reveal whether the email exists
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id})
    response.set_cookie(
        key="access_token", value=token,
        httponly=True, samesite="lax",
        secure=True,          # Set to True in production (HTTPS)
        max_age=604800,
    )
    return {"message": "Signed in", "user_id": user.id, "access_token": token}


@router.post("/signout")
def signout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Signed out"}


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
