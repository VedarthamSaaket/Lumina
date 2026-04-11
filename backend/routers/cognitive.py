# backend/routers/cognitive.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any, Optional
from models.database import get_db, CognitiveTestResult, InsightSummary
from utils.auth import get_current_user
from datetime import datetime
import json

# ── FIX: prefix must be /api/cognitive so frontend /api/cognitive/memory works ─
router = APIRouter(prefix="/api/cognitive", tags=["cognitive"])

# ── Valid game types ──────────────────────────────────────────────────────────
# FIX: added all 5 fluid-intelligence puzzle types so they are never silently
#      reclassified as "digit" when saved.
VALID_GAME_TYPES = {
    # Working-memory games
    "digit", "spatial", "word",
    "letter", "math", "color",
    "spatial_reverse",
    # Fluid-intelligence / Cattell Culture Fair puzzles
    "matrix", "oddoneout", "series", "analogy", "paperfold",
}

GAME_DISPLAY_NAMES = {
    # Working-memory
    "digit":           "Number Sequence",
    "letter":          "Letter Sequence",
    "math":            "Math Patterns",
    "color":           "Color Pattern",
    "spatial":         "Pattern Memory",
    "spatial_reverse": "Reverse Spatial",
    "word":            "Word Recall",
    # Fluid-intelligence
    "matrix":          "Matrix Reasoning",
    "oddoneout":       "Odd One Out",
    "series":          "Series Completion",
    "analogy":         "Visual Analogy",
    "paperfold":       "Paper Folding",
}

# ── Schemas ───────────────────────────────────────────────────────────────────

class MemoryResultSave(BaseModel):
    game_type:    str
    stats:        dict[str, Any]
    rounds_data:  Any
    ai_summary:   Optional[str] = None
    completed_at: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/memory")
async def save_memory_result(
    data: MemoryResultSave,
    user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # FIX: keep the exact game_type if known; fall back to "digit" only for truly
    #      unknown values so puzzle results are stored under their own type.
    game_type = data.game_type if data.game_type in VALID_GAME_TYPES else "digit"

    completed_at = datetime.utcnow()
    if data.completed_at:
        try:
            completed_at = datetime.fromisoformat(data.completed_at.replace("Z", "+00:00"))
        except ValueError:
            pass

    record = CognitiveTestResult(
        user_id      = user.id,
        test_type    = game_type,
        score_data   = json.dumps(data.stats),
        raw_results  = json.dumps(data.rounds_data),
        completed_at = completed_at,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Save AI summary as an InsightSummary so the dashboard can surface it
    if data.ai_summary and data.ai_summary.strip():
        display = GAME_DISPLAY_NAMES.get(game_type, game_type)
        insight = InsightSummary(
            user_id = user.id,
            title   = f"{display} - {completed_at.strftime('%b %d, %Y')}",
            content = data.ai_summary.strip(),
            source  = "memory_game",
        )
        db.add(insight)
        db.commit()

    return {"status": "saved", "game_type": game_type, "record_id": record.id}


@router.get("/memory/history")
async def get_memory_history(
    user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns history for ALL game types, most recent first. Includes rounds_data."""
    records = (
        db.query(CognitiveTestResult)
        .filter(CognitiveTestResult.user_id == user.id)
        .order_by(CognitiveTestResult.completed_at.desc())
        .limit(50)
        .all()
    )

    results = []
    for r in records:
        try:
            scores = json.loads(r.score_data) if r.score_data else {}
        except (json.JSONDecodeError, TypeError):
            scores = {}

        try:
            rounds = json.loads(r.raw_results) if r.raw_results else []
        except (json.JSONDecodeError, TypeError):
            rounds = []

        results.append({
            "id":           r.id,
            "game_type":    r.test_type,
            "display_name": GAME_DISPLAY_NAMES.get(r.test_type, r.test_type),
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "scores":       scores,
            "rounds":       rounds,
        })

    return results


@router.get("/memory/history/{game_type}")
async def get_memory_history_by_type(
    game_type: str,
    user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(CognitiveTestResult)
        .filter(
            CognitiveTestResult.user_id  == user.id,
            CognitiveTestResult.test_type == game_type,
        )
        .order_by(CognitiveTestResult.completed_at.desc())
        .limit(20)
        .all()
    )

    results = []
    for r in records:
        try:
            scores = json.loads(r.score_data) if r.score_data else {}
        except (json.JSONDecodeError, TypeError):
            scores = {}

        try:
            rounds = json.loads(r.raw_results) if r.raw_results else []
        except (json.JSONDecodeError, TypeError):
            rounds = []

        results.append({
            "id":           r.id,
            "game_type":    r.test_type,
            "display_name": GAME_DISPLAY_NAMES.get(r.test_type, r.test_type),
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "scores":       scores,
            "rounds":       rounds,
        })

    return results