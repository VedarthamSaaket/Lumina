# backend/routers/journal.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from models.database import get_db, User, JournalEntry, MoodLog
from utils.auth import get_current_user
from middleware.ownership import require_owner

router = APIRouter(prefix="/api/journal", tags=["journal"])


class JournalCreate(BaseModel):
    content: str
    mood_score: Optional[int] = None
    tags: list[str] = []


@router.post("")
def create_entry(
    data: JournalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = JournalEntry(
        user_id    = user.id,
        content    = data.content,
        mood_score = data.mood_score,
        tags       = data.tags,
    )
    db.add(entry)

    if data.mood_score is not None:
        mood_note = f"From journal entry. Tags: {', '.join(data.tags)}" if data.tags else "From journal entry."
        db.add(MoodLog(user_id=user.id, score=data.mood_score, note=mood_note, tags=data.tags))

    db.commit()
    db.refresh(entry)
    return entry


@router.get("")
def list_entries(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Filter by user.id — only this user's entries are ever returned
    return (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == user.id)
        .order_by(JournalEntry.created_at.desc())
        .all()
    )


@router.delete("/{entry_id}")
def delete_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    # require_owner raises 404 if not found OR if owned by someone else
    require_owner(entry, current_user_id=user.id, resource_name="Journal entry")
    db.delete(entry)
    db.commit()
    return {"deleted": True}
