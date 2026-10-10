import asyncio

from fastapi import APIRouter, Depends, HTTPException, Response
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings, logger
from models.database import get_db, User
from utils.auth import create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

REMEMBER_MAX_AGE = 60 * 60 * 24 * 30
SESSION_MAX_AGE = 60 * 60 * 24 * 7

_google_request = google_requests.Request()


class FirebaseSigninRequest(BaseModel):
    id_token: str
    remember: bool = True


class ProfileRequest(BaseModel):
    full_name: str | None = None
    age: int | None = None
    gender: str | None = None
    age_confirmed: bool | None = None


def _set_auth_cookie(response: Response, token: str, remember: bool) -> None:
    response.set_cookie(
        key="access_token", value=token,
        httponly=True, samesite="lax",
        secure=settings.ENFORCE_HTTPS,
        max_age=REMEMBER_MAX_AGE if remember else SESSION_MAX_AGE,
    )


def _verify_firebase_token(token: str) -> dict:
    project = settings.FIREBASE_PROJECT_ID
    claims = google_id_token.verify_firebase_token(token, _google_request, audience=project)
    if not claims or claims.get("iss") != f"https://securetoken.google.com/{project}":
        raise ValueError("wrong issuer")
    if not claims.get("sub") or not claims.get("email"):
        raise ValueError("token carries no account")
    if not claims.get("email_verified"):
        raise ValueError("email not verified")
    return claims


def _profile_payload(user: User) -> dict:
    return {
        "id":            user.id,
        "email":         user.email,
        "theme":         user.theme,
        "age_confirmed": user.age_confirmed,
        "created_at":    user.created_at,
        "full_name":     user.full_name,
        "age":           user.age,
        "gender":        user.gender,
    }


@router.post("/firebase")
async def firebase_signin(data: FirebaseSigninRequest, response: Response, db: Session = Depends(get_db)):
    if not settings.FIREBASE_PROJECT_ID:
        raise HTTPException(status_code=503, detail="Sign-in is not configured yet")
    try:
        claims = await asyncio.to_thread(_verify_firebase_token, data.id_token)
    except Exception as e:
        logger.warning("[AUTH] rejected Firebase token: %s", type(e).__name__)
        raise HTTPException(status_code=401, detail="Could not verify your Google sign-in")

    uid = claims["sub"]
    email = claims["email"].strip().lower()
    user = db.query(User).filter(User.firebase_uid == uid).first()
    is_new = False
    if user is None:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(email=email, full_name=claims.get("name"), email_verified=True)
            db.add(user)
            is_new = True
        user.firebase_uid = uid
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": user.id})
    _set_auth_cookie(response, token, data.remember)
    return {
        "message": "Signed in",
        "user_id": user.id,
        "access_token": token,
        "is_new": is_new,
        "full_name": user.full_name,
    }


@router.post("/profile")
def update_profile(data: ProfileRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip()[:80] or current_user.full_name
    if data.age is not None:
        if not 13 <= data.age <= 120:
            raise HTTPException(status_code=400, detail="Please enter a valid age")
        current_user.age = data.age
    if data.gender is not None:
        current_user.gender = data.gender.strip()[:40] or None
    if data.age_confirmed is not None:
        current_user.age_confirmed = data.age_confirmed
    db.commit()
    db.refresh(current_user)
    return _profile_payload(current_user)


@router.post("/signout")
def signout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Signed out"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return _profile_payload(current_user)
