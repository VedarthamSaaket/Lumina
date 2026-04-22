# backend/routers/settings.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from models.database import get_db, User
from utils.auth import get_current_user
import json

router = APIRouter(prefix="/api/settings", tags=["settings"])


class UserSettings(BaseModel):
    # Identity
    preferred_name: Optional[str] = ""
    pronouns: Optional[str] = ""
    about_me: Optional[str] = ""

    # AI Communication Style
    ai_tone: Optional[str] = "warm"           # warm | direct | clinical | playful
    response_length: Optional[str] = "medium" # short | medium | long
    use_name_in_chat: Optional[bool] = True

    # Context Controls — what the AI is allowed to draw from
    use_mood_context: Optional[bool] = True
    use_screening_context: Optional[bool] = True
    use_cbt_context: Optional[bool] = True
    use_memory_context: Optional[bool] = True
    use_journal_context: Optional[bool] = True

    # Crisis Sensitivity
    crisis_sensitivity: Optional[str] = "standard"  # low | standard | high

    # Focus Areas — topics the user wants the AI to be most aware of
    focus_areas: Optional[List[str]] = []


def _defaults() -> dict:
    return UserSettings().model_dump()


@router.get("")
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the user's stored settings, merged with defaults."""
    raw = getattr(current_user, "settings_json", None)
    stored: dict = {}
    if raw:
        try:
            stored = json.loads(raw) if isinstance(raw, str) else {}
        except Exception:
            stored = {}

    merged = {**_defaults(), **stored}
    return merged


@router.post("")
def save_settings(
    data: UserSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Persist the user's settings."""
    current_user.settings_json = json.dumps(data.model_dump())
    db.commit()
    return {"saved": True, "settings": data.model_dump()}


@router.delete("/chat-history")
def clear_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete all conversations and messages for this user only."""
    from models.database import ChatMessage, Conversation
    # Belt-and-suspenders: always filter by user_id
    db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).delete()
    db.query(Conversation).filter(Conversation.user_id == current_user.id).delete()
    db.commit()
    return {"cleared": True}