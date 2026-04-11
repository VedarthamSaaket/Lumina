# backend/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from models.database import get_db, User
from utils.auth import hash_password, verify_password, create_access_token, get_current_user

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


@router.post("/signup")
def signup(data: SignupRequest, response: Response, db: Session = Depends(get_db)):
    if not data.age_confirmed:
        raise HTTPException(status_code=400, detail="Age confirmation required (16+)")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

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

    # Set httponly cookie AND return token in body so frontend can store it
    response.set_cookie(key="access_token", value=token, httponly=True, samesite="lax", max_age=604800)
    return {"message": "Account created", "user_id": user.id, "access_token": token}


@router.post("/signin")
def signin(data: SigninRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id})

    # Set httponly cookie AND return token in body so frontend can store it
    response.set_cookie(key="access_token", value=token, httponly=True, samesite="lax", max_age=604800)
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