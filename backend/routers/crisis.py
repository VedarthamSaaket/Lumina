# backend/routers/crisis.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from models.database import get_db, User, CrisisLog
from utils.auth import get_optional_user

router = APIRouter(prefix="/api/crisis", tags=["crisis"])

RESOURCES = [
    {"name": "iCall (India)", "number": "9152987821", "url": "https://icallhelpline.org", "country": "India"},
    {"name": "Vandrevala Foundation", "number": "1860-2662-345", "url": "https://www.vandrevalafoundation.com", "country": "India"},
    {"name": "NIMHANS", "number": "080-46110007", "url": "https://nimhans.ac.in", "country": "India"},
    {"name": "988 Suicide & Crisis Lifeline", "number": "988", "url": "https://988lifeline.org", "country": "United States"},
    {"name": "Crisis Text Line", "number": "Text HOME to 741741", "url": "https://www.crisistextline.org", "country": "Global"},
    {"name": "Samaritans", "number": "116 123", "url": "https://www.samaritans.org", "country": "United Kingdom"},
    {"name": "Befrienders Worldwide", "number": "", "url": "https://www.befrienders.org", "country": "Global"},
]

class CrisisLogRequest(BaseModel):
    level: int
    content: str

@router.get("/resources")
def get_resources(country: Optional[str] = None):
    if country:
        filtered = [r for r in RESOURCES if r["country"] in (country, "Global")]
        return filtered or RESOURCES
    return RESOURCES

@router.post("/log")
def log_crisis(data: CrisisLogRequest, db: Session = Depends(get_db), user: Optional[User] = Depends(get_optional_user)):
    log = CrisisLog(user_id=user.id if user else None, level=data.level, content=data.content[:500])
    db.add(log)
    db.commit()
    return {"logged": True}
