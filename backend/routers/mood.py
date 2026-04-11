# backend/routers/mood.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from models.database import get_db, User, MoodLog
from utils.auth import get_current_user

router = APIRouter(prefix="/api/mood", tags=["mood"])

class MoodCreate(BaseModel):
    score: int
    note: Optional[str] = None
    tags: list[str] = []

@router.post("")
def log_mood(data: MoodCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not 1 <= data.score <= 10:
        raise HTTPException(status_code=400, detail="Score must be 1–10")
    log = MoodLog(user_id=user.id, score=data.score, note=data.note, tags=data.tags)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.get("/history")
def mood_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(MoodLog).filter(MoodLog.user_id == user.id).order_by(MoodLog.created_at.asc()).all()
