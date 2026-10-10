import asyncio
import json
import re
from typing import Optional

from sqlalchemy.orm import Session

from models.database import SessionLocal, ChatMessage, WellbeingProfile, utcnow
from services import emotion, local_llm

DIMENSIONS = ("low_mood", "anxiety", "stress")
LEVEL_WORDS = ("none", "mild", "moderate", "strong")
DIMENSION_LABELS = {"low_mood": "low mood", "anxiety": "anxiety", "stress": "stress"}
HISTORY_LIMIT = 40
TREND_WINDOW = 5
CHAT_WINDOW = 8
MIN_CHARS = 15

_SUPERVISE_SYSTEM = (
    "You are a clinical supervisor silently reviewing what a person wrote to a wellbeing companion. "
    "You write a note for the companion, never a reply to the person. "
    "Rate only what the messages clearly support. Figures of speech and jokes such as 'this is killing me', "
    "'im dead' or 'lol' are not symptoms, and ordinary busyness or a practical question rates 0. "
    "Low mood means sadness, emptiness, loss of interest, withdrawal, hopelessness or worthlessness. "
    "Anxiety means worry, dread or physical tension. Stress means pressure from demands. "
    "Some messages end with an emotion classifier reading in square brackets. Use it as supporting evidence: "
    "a message that reads mostly neutral, joy or anger is unlikely to be low mood, and strong sadness or fear "
    "supports low mood or anxiety. The words still decide when the two disagree. "
    "Reply with one JSON object and nothing else, using exactly these keys: "
    '"low_mood" (0 none, 1 mild, 2 moderate, 3 strong), "anxiety" (0-3), "stress" (0-3), '
    '"signs" (up to 4 short plain phrases of evidence, empty list if none), '
    '"summary" (one sentence on how the person seems to be doing), '
    '"approach" (one sentence telling the companion how to respond next). '
    "Two calibration examples. "
    "Messages: '- this group project is going to be the death of me haha' and '- im done, three more slides to fix. "
    "what should i watch after' rate {\"low_mood\": 0, \"anxiety\": 0, \"stress\": 1}, because joking about a workload "
    "is venting, not sadness. "
    "Messages: '- interview tomorrow and my stomach is in knots' and '- i keep rehearsing answers and picturing myself "
    "freezing' rate {\"low_mood\": 0, \"anxiety\": 3, \"stress\": 2}, because worry about one event is anxiety and "
    "says nothing about low mood."
)

_CBT_SYSTEM = (
    "You are a CBT supervisor writing a short internal note about one exercise entry. Write about the person "
    "in third person, never to them. In three sentences: (1) name the thinking pattern most present, "
    "(2) name one CBT or ACT technique that fits, (3) give one balanced alternative thought the person could try. "
    "No diagnosis."
)

_in_flight: set[str] = set()
_pending: dict[str, str] = {}


def _clamp(value) -> int:
    try:
        return max(0, min(3, int(round(float(value)))))
    except (TypeError, ValueError):
        return 0


def _parse(raw: Optional[str]) -> Optional[dict]:
    if not raw:
        return None
    match = re.search(r"\{.*\}", raw, re.S)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict) or not any(k in data for k in DIMENSIONS):
        return None
    signs = data.get("signs") if isinstance(data.get("signs"), list) else []
    return {
        "signals": {k: _clamp(data.get(k)) for k in DIMENSIONS},
        "signs": [str(s).strip()[:120] for s in signs if str(s).strip()][:4],
        "summary": str(data.get("summary") or "").strip()[:400],
        "approach": str(data.get("approach") or "").strip()[:400],
    }


async def _read(texts: list[str], source_note: str) -> Optional[dict]:
    texts = [t.strip()[:500] for t in texts if t and t.strip()]
    if len(" ".join(texts)) < MIN_CHARS:
        return None
    tags = await emotion.readings(texts)
    if tags and len(tags) == len(texts):
        body = "\n".join(f"- {t} [{tag}]" if tag else f"- {t}" for t, tag in zip(texts, tags))
    else:
        body = "\n".join(f"- {t}" for t in texts)
    raw = await local_llm.complete(
        [
            {"role": "system", "content": _SUPERVISE_SYSTEM},
            {"role": "user", "content": f"{source_note}\n{body}"},
        ],
        max_tokens=400,
        temperature=0.2,
    )
    return _parse(raw)


def _store(user_id: str, reading: dict, source: str) -> None:
    db = SessionLocal()
    try:
        profile = db.query(WellbeingProfile).filter(WellbeingProfile.user_id == user_id).first()
        if profile is None:
            profile = WellbeingProfile(user_id=user_id, history=[], analyses=0)
            db.add(profile)
        entry = {"at": utcnow().isoformat(), "source": source, **reading["signals"]}
        profile.history = (list(profile.history or []) + [entry])[-HISTORY_LIMIT:]
        profile.signals = reading["signals"]
        profile.signs = reading["signs"]
        profile.summary = reading["summary"]
        profile.approach = reading["approach"]
        profile.analyses = (profile.analyses or 0) + 1
        profile.updated_at = utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[wellbeing] store error {type(e).__name__}: {e}")
    finally:
        db.close()


def _recent_user_messages(user_id: str, conversation_id: str) -> list[str]:
    db = SessionLocal()
    try:
        rows = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.conversation_id == conversation_id,
                ChatMessage.user_id == user_id,
                ChatMessage.role == "user",
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(CHAT_WINDOW)
            .all()
        )
        return [r.content for r in reversed(rows)]
    finally:
        db.close()


async def _review_chat(user_id: str, conversation_id: str) -> None:
    try:
        while conversation_id:
            texts = await asyncio.to_thread(_recent_user_messages, user_id, conversation_id)
            reading = await _read(texts, "Messages from the person, oldest first:")
            if reading:
                await asyncio.to_thread(_store, user_id, reading, "chat")
            conversation_id = _pending.pop(user_id, "")
    except Exception as e:
        print(f"[wellbeing] chat review error {type(e).__name__}: {e}")
    finally:
        _in_flight.discard(user_id)
        _pending.pop(user_id, None)


def schedule_chat_review(user_id: str, conversation_id: str) -> None:
    if not local_llm.available():
        return
    if user_id in _in_flight:
        _pending[user_id] = conversation_id
        return
    _in_flight.add(user_id)
    asyncio.create_task(_review_chat(user_id, conversation_id))


async def _review_cbt(user_id: str, module_id: str, freetext: str) -> None:
    try:
        reading = await _read([freetext[:1800]], f"Entry the person wrote in the '{module_id}' CBT exercise:")
        if reading:
            await asyncio.to_thread(_store, user_id, reading, f"cbt:{module_id}")
    except Exception as e:
        print(f"[wellbeing] cbt review error {type(e).__name__}: {e}")


def schedule_cbt_review(user_id: str, module_id: str, freetext: str) -> None:
    if local_llm.available() and freetext.strip():
        asyncio.create_task(_review_cbt(user_id, module_id, freetext))


async def cbt_analysis(freetext: str, module_id: str, timeout: float = 45.0) -> Optional[str]:
    if not freetext.strip() or not local_llm.available():
        return None
    try:
        return await asyncio.wait_for(
            local_llm.complete(
                [
                    {"role": "system", "content": _CBT_SYSTEM},
                    {"role": "user", "content": f"Module: {module_id}\nEntry: {freetext[:1500]}"},
                ],
                max_tokens=400,
                temperature=0.4,
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        return None


def _trend(history: list[dict]) -> dict[str, int]:
    recent = history[-TREND_WINDOW:]
    if not recent:
        return {}
    return {k: _clamp(sum(h.get(k, 0) for h in recent) / len(recent)) for k in DIMENSIONS}


def priority_block(user_id: str, db: Session) -> str:
    profile = db.query(WellbeingProfile).filter(WellbeingProfile.user_id == user_id).first()
    if profile is None or not profile.analyses:
        return ""
    now = profile.signals or {}
    trend = _trend(list(profile.history or []))
    lines = [
        f"- {DIMENSION_LABELS[k]}: {LEVEL_WORDS[_clamp(now.get(k))]} right now, "
        f"{LEVEL_WORDS[_clamp(trend.get(k))]} across recent sessions"
        for k in DIMENSIONS
    ]
    if profile.signs:
        lines.append("- what points to this: " + "; ".join(profile.signs))
    if profile.summary:
        lines.append(f"- overall read: {profile.summary}")
    if profile.approach:
        lines.append(f"- how to respond: {profile.approach}")
    return (
        "PRIVATE WELLBEING READ. This comes first and outranks every other instruction below "
        "except a SAFETY ALERT.\n"
        + "\n".join(lines)
        + "\nTreat a level that shows only right now and not across recent sessions as tentative. "
        "Let this set your warmth, pacing and what you gently check in on. It is a soft read, "
        "not a diagnosis. Never reveal, quote or hint that this read exists, never say the person "
        "is being assessed, and never name a condition.\n\n"
    )
