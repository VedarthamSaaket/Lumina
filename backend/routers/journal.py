# backend/routers/journal.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from models.database import get_db, User, JournalEntry, MoodLog
from utils.auth import get_current_user
from middleware.ownership import require_owner
from services.signals import journal_tags

router = APIRouter(prefix="/api/journal", tags=["journal"])


class JournalCreate(BaseModel):
    content: str
    mood_score: Optional[int] = None
    tags: list[str] = []
    stickers: list[dict] = []


@router.post("")
async def create_entry(
    data: JournalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    auto_emotion_tags = await journal_tags(data.content)
    merged_tags = list(dict.fromkeys((data.tags or []) + auto_emotion_tags))

    entry = JournalEntry(
        user_id    = user.id,
        content    = data.content,
        mood_score = data.mood_score,
        tags       = merged_tags,
        stickers   = data.stickers,
    )
    db.add(entry)

    if data.mood_score is not None:
        mood_note = f"From journal entry. Tags: {', '.join(merged_tags)}" if merged_tags else "From journal entry."
        db.add(MoodLog(user_id=user.id, score=data.mood_score, note=mood_note, tags=merged_tags))

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
