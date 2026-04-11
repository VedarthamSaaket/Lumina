# backend/routers/screening.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from models.database import get_db, User, ScreeningResult
from utils.auth import get_current_user
import json

router = APIRouter(prefix="/api/screening", tags=["screening"])

# ─── Scoring config ───────────────────────────────────────────────────────────
# Each entry: (max_score, label)
# Tests with reversed items are handled in calc_score below.

REVERSED_ITEMS: dict[str, set] = {
    "RSES":      {2, 4, 7, 8, 9},
    "SELFWORTH": {2, 4, 7, 8, 9},  # same structure as RSES
}

SEVERITY_MAP: dict[str, list[tuple[int, str]]] = {
    # ── Legacy names (kept so old saved data still scores correctly) ──────────
    "PHQ9": [
        (4,  "Minimal"),
        (9,  "Mild"),
        (14, "Moderate"),
        (19, "Moderately Severe"),
        (27, "Severe"),
    ],
    "GAD7": [
        (4,  "Minimal Anxiety"),
        (9,  "Mild Anxiety"),
        (14, "Moderate Anxiety"),
        (21, "Severe Anxiety"),
    ],
    "RSES": [
        (14, "Low Self-Esteem"),
        (25, "Normal Range"),
        (30, "High Self-Esteem"),
    ],

    # ── Wellbeing ─────────────────────────────────────────────────────────────
    "MOOD": [
        (4,  "Doing well"),
        (9,  "Mild dip"),
        (14, "Noticeable strain"),
        (19, "Significant weight"),
        (27, "Feeling quite heavy"),
    ],
    "WORRY": [
        (4,  "Calm and grounded"),
        (9,  "Mild tension"),
        (14, "Moderate worry"),
        (21, "High anxiety"),
    ],
    "SELFWORTH": [
        (14, "Quite self-critical"),
        (25, "Balanced self-view"),
        (30, "Strong self-regard"),
    ],

    # ── Personality ───────────────────────────────────────────────────────────
    "BIGFIVE": [
        (15, "Reflective and measured"),
        (27, "Balanced blend"),
        (40, "Highly expressive"),
    ],
    "ATTACHMENT": [
        (15, "More avoidant tendencies"),
        (25, "Mixed or earned security"),
        (40, "More anxious tendencies"),
    ],
    "EQ": [
        (15, "Still developing"),
        (27, "Emotionally aware"),
        (40, "Highly emotionally intelligent"),
    ],

    "STRESS": [
        (15, "Still finding your footing"),
        (27, "Developing resilience"),
        (40, "Resourceful under pressure"),
    ],

    # ── Career ────────────────────────────────────────────────────────────────
    "CAREERVALUES": [
        (15, "Security-oriented"),
        (27, "Balance-seeking"),
        (40, "Growth and autonomy driven"),
    ],
    "WORKENVIRONMENT": [
        (20, "Independent and structured"),
        (30, "Adaptable"),
        (40, "Collaborative and dynamic"),
    ],
    "LEADERSHIP": [
        (20, "Deep contributor"),
        (30, "Hybrid profile"),
        (40, "Natural leader"),
    ],
    "BURNOUT": [
        (12, "Holding up well"),
        (22, "Some signs of strain"),
        (40, "Worth paying attention to"),
    ],
}

VALID_TYPES = set(SEVERITY_MAP.keys())


def calc_score(qtype: str, answers: List[int]) -> int:
    reversed_set = REVERSED_ITEMS.get(qtype, set())
    return sum(
        (3 - v) if i in reversed_set else v
        for i, v in enumerate(answers)
    )


def get_severity(score: int, qtype: str) -> str:
    thresholds = SEVERITY_MAP.get(qtype, [])
    for max_score, label in thresholds:
        if score <= max_score:
            return label
    return thresholds[-1][1] if thresholds else "Unknown"


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ScreeningSubmit(BaseModel):
    type: str
    answers: List[int]
    question_contexts: Optional[List[str]] = None


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("")
def submit_screening(
    data: ScreeningSubmit,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if data.type not in VALID_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown screening type '{data.type}'. Valid types: {sorted(VALID_TYPES)}",
        )

    score    = calc_score(data.type, data.answers)
    severity = get_severity(score, data.type)

    # Store per-question context alongside each answer index
    structured = [
        {
            "index":   i,
            "answer":  ans,
            "context": (data.question_contexts or [])[i]
                       if data.question_contexts and i < len(data.question_contexts)
                       else "",
        }
        for i, ans in enumerate(data.answers)
    ]

    result = ScreeningResult(
        user_id           = user.id,
        type              = data.type,
        answers           = data.answers,
        score             = score,
        severity          = severity,
        question_contexts = json.dumps(structured),
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    return {"score": score, "severity": severity, "type": data.type}


@router.get("/history")
def screening_history(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(ScreeningResult)
        .filter(ScreeningResult.user_id == user.id)
        .order_by(ScreeningResult.completed_at.desc())
        .all()
    )
    # Return plain dicts so FastAPI serialises cleanly without needing a schema
    return [
        {
            "id":           r.id,
            "type":         r.type,
            "score":        r.score,
            "severity":     r.severity,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in rows
    ]