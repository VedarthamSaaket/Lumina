# backend/routers/dashboard.py  (ownership-hardened)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from models.database import (
    get_db, User, JournalEntry, MoodLog, ScreeningResult,
    CBTProgress, CognitiveTestResult, InsightSummary,
)
from utils.auth import get_current_user
from services.llm import generate_summary
from middleware.ownership import require_owner
from pydantic import BaseModel

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

TEST_NAMES = {
    "MOOD": "Mood Check", "WORRY": "Mind and Worry", "SELFWORTH": "How You See Yourself",
    "BIGFIVE": "Who You Are", "ATTACHMENT": "How You Connect", "EQ": "Emotional Intelligence",
    "STRESS": "Stress and Coping", "CAREERVALUES": "What Work Means to You",
    "WORKENVIRONMENT": "Where You Work Best", "LEADERSHIP": "How You Lead and Contribute",
    "BURNOUT": "Your Energy and Limits",
}


@router.get("/")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id   # single authoritative value used in ALL queries

    mood_rows = (
        db.query(MoodLog)
        .filter(MoodLog.user_id == uid)
        .order_by(desc(MoodLog.created_at))
        .limit(30).all()
    )
    mood_history = [
        {"score": m.score, "note": m.note, "tags": m.tags, "created_at": m.created_at}
        for m in mood_rows
    ]

    screening_rows = (
        db.query(ScreeningResult)
        .filter(ScreeningResult.user_id == uid)
        .order_by(desc(ScreeningResult.completed_at))
        .limit(10).all()
    )
    screening_history = [
        {"type": r.type, "name": TEST_NAMES.get(r.type, r.type),
         "score": r.score, "severity": r.severity, "completed_at": r.completed_at}
        for r in screening_rows
    ]

    journal_count   = db.query(JournalEntry).filter(JournalEntry.user_id == uid).count()
    recent_journals = (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == uid)
        .order_by(desc(JournalEntry.created_at))
        .limit(5).all()
    )
    recent_journal_tags = list({tag for j in recent_journals for tag in (j.tags or [])})

    cbt_rows         = db.query(CBTProgress).filter(CBTProgress.user_id == uid).all()
    completed_modules = list({r.module_id for r in cbt_rows})
    all_modules      = ["distortion", "reframing", "activation", "esteem", "exposure", "habit"]
    cbt_progress = {
        "completed": completed_modules,
        "total":     len(all_modules),
        "remaining": [m for m in all_modules if m not in completed_modules],
    }

    cognitive_count = (
        db.query(CognitiveTestResult)
        .filter(CognitiveTestResult.user_id == uid)
        .count()
    )

    summaries = (
        db.query(InsightSummary)
        .filter(InsightSummary.user_id == uid)
        .order_by(desc(InsightSummary.created_at))
        .limit(5).all()
    )
    saved_summaries = [
        {"id": s.id, "title": s.title, "content": s.content,
         "source": s.source, "created_at": s.created_at}
        for s in summaries
    ]

    mood_avg = None
    if mood_history:
        mood_avg = round(sum(m["score"] for m in mood_history) / len(mood_history), 1)

    return {
        "user":      {"full_name": current_user.full_name, "age": current_user.age, "gender": current_user.gender},
        "mood":      {"history": mood_history, "average": mood_avg, "total_logs": len(mood_history)},
        "screening": {"history": screening_history, "total_completed": len(screening_history)},
        "journal":   {"total_entries": journal_count, "recent_tags": recent_journal_tags},
        "cbt":       cbt_progress,
        "cognitive": {"sessions_played": cognitive_count},
        "summaries": saved_summaries,
    }


class SaveSummaryRequest(BaseModel):
    title:   str
    content: str
    source:  str


@router.post("/summaries")
async def save_summary(
    body: SaveSummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary = InsightSummary(
        user_id = current_user.id,
        title   = body.title,
        content = body.content,
        source  = body.source,
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return {"id": summary.id, "title": summary.title, "created_at": summary.created_at}


@router.get("/summaries")
def get_summaries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summaries = (
        db.query(InsightSummary)
        .filter(InsightSummary.user_id == current_user.id)
        .order_by(desc(InsightSummary.created_at))
        .all()
    )
    return [
        {"id": str(s.id), "title": s.title, "content": s.content,
         "source": s.source, "created_at": s.created_at}
        for s in summaries
    ]


@router.delete("/summaries/{summary_id}")
def delete_summary(
    summary_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summary = db.query(InsightSummary).filter(InsightSummary.id == summary_id).first()
    require_owner(summary, current_user_id=current_user.id, resource_name="Summary")
    db.delete(summary)
    db.commit()
    return {"ok": True}


@router.post("/generate-insight")
async def generate_insight(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id

    mood_rows = (
        db.query(MoodLog)
        .filter(MoodLog.user_id == uid)
        .order_by(desc(MoodLog.created_at))
        .limit(14).all()
    )
    screening_rows = (
        db.query(ScreeningResult)
        .filter(ScreeningResult.user_id == uid)
        .order_by(desc(ScreeningResult.completed_at))
        .limit(5).all()
    )
    journal_count  = db.query(JournalEntry).filter(JournalEntry.user_id == uid).count()
    cbt_rows       = db.query(CBTProgress).filter(CBTProgress.user_id == uid).all()
    completed_modules = list({r.module_id for r in cbt_rows})

    mood_summary = ""
    if mood_rows:
        avg = round(sum(m.score for m in mood_rows) / len(mood_rows), 1)
        mood_summary = f"Mood average over last {len(mood_rows)} logs: {avg}/10."

    screening_summary = ""
    if screening_rows:
        parts = [f"{TEST_NAMES.get(r.type, r.type)}: {r.score} ({r.severity})" for r in screening_rows]
        screening_summary = "Recent self-reflection results: " + ", ".join(parts) + "."

    cbt_summary     = f"CBT modules completed: {len(completed_modules)} of 6." if completed_modules else "No CBT modules completed yet."
    journal_summary = f"Journal entries written: {journal_count}." if journal_count else ""

    prompt = f"""You are Lumina, a warm AI companion. Based on the following data about a user, write a short, warm, personal insight summary (3 paragraphs, no headers, no em dashes, no diagnoses). Speak directly to the user as "you". Be human and gentle.

DATA:
{mood_summary}
{screening_summary}
{cbt_summary}
{journal_summary}

Focus on patterns you notice, what seems to be going well, and one gentle suggestion. Under 200 words."""

    content = await generate_summary(prompt)

    from datetime import datetime
    summary = InsightSummary(
        user_id = uid,
        title   = f"Insight - {datetime.utcnow().strftime('%b %d, %Y')}",
        content = content,
        source  = "dashboard",
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)

    return {"id": summary.id, "title": summary.title, "content": content, "created_at": summary.created_at}
