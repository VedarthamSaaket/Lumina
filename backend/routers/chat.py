# backend/routers/chat.py  (settings-aware version)
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from models.database import (
    get_db, User, CrisisLog, ScreeningResult, CognitiveTestResult,
    MoodLog, JournalEntry, CBTProgress, Conversation, ChatMessage,
)
from utils.auth import get_current_user
from services.llm import (
    chat_with_llama, chat_with_llama_stream,
    detect_risk_level, detect_risk_augmented, detect_risk_full,
    post_process_response, build_user_context,
)
from services import emotion, wellbeing
from services.signals import review_reply
from middleware.ownership import require_owner
from datetime import datetime
import json, re

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/context")
def get_chat_context(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the context Lumina would inject into a chat session (for the memory viewer in settings)."""
    user_settings = _get_user_settings(current_user.id, db)
    context = _get_user_context(current_user.id, db, user_settings)
    settings_prompt = _build_settings_prompt(user_settings)

    # Also include insight summaries
    from models.database import InsightSummary
    summaries = (
        db.query(InsightSummary)
        .filter(InsightSummary.user_id == current_user.id, InsightSummary.source.notin_(["orion_memory", "orion_debrief"]))
        .order_by(desc(InsightSummary.created_at))
        .limit(10)
        .all()
    )
    insights = [{"title": s.title, "content": s.content[:200], "source": s.source, "created_at": s.created_at.isoformat() if s.created_at else None} for s in summaries]

    return {
        "settings_prompt": settings_prompt.strip() if settings_prompt else "",
        "user_context": context.strip() if context else "",
        "insights": insights,
        "name": user_settings.get("preferred_name", ""),
        "tone": user_settings.get("ai_tone", "warm"),
        "focus_areas": user_settings.get("focus_areas", []),
    }


class MessageRequest(BaseModel):
    content: str
    history: list[dict] = []
    conversation_id: str | None = None


class NewConversationRequest(BaseModel):
    title: str | None = None


# ── Settings helpers ──────────────────────────────────────────────────────────

def _get_user_settings(user_id: str, db: Session) -> dict:
    """Load settings_json from the User row; merge with defaults."""
    from models.database import User as UserModel
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    raw = getattr(user, "settings_json", None) if user else None
    defaults = {
        "preferred_name": "",
        "pronouns": "",
        "about_me": "",
        "ai_tone": "warm",
        "response_length": "medium",
        "use_name_in_chat": True,
        "use_mood_context": True,
        "use_screening_context": True,
        "use_cbt_context": True,
        "use_memory_context": True,
        "use_journal_context": True,
        "crisis_sensitivity": "standard",
        "focus_areas": [],
    }
    if not raw:
        return defaults
    try:
        stored = json.loads(raw) if isinstance(raw, str) else {}
        return {**defaults, **stored}
    except Exception:
        return defaults


def _build_settings_prompt(s: dict) -> str:
    """Turn user settings into a system-prompt block appended before context."""
    lines = ["\n\n═══════════════════════════════════════════════"]
    lines.append("USER PREFERENCES (follow these carefully)")
    lines.append("═══════════════════════════════════════════════")

    # Identity
    name     = s.get("preferred_name", "").strip()
    pronouns = s.get("pronouns", "").strip()
    use_name = s.get("use_name_in_chat", True)
    if name:
        if use_name:
            lines.append(
                f"- This user prefers to be called '{name}'. Use their name occasionally "
                "in conversation — naturally, the way a friend would, not in every message."
            )
        else:
            lines.append(
                f"- The user's preferred name is '{name}' but they prefer you NOT use it "
                "in chat. Avoid addressing them by name."
            )
    if pronouns and pronouns not in ("prefer not to say",):
        lines.append(f"- The user's pronouns are {pronouns}. Use these when referring to them.")

    # About me
    about = s.get("about_me", "").strip()
    if about:
        lines.append(
            "\nUSER'S SELF-DESCRIPTION (read this and let it inform how you respond — "
            "do not quote it back):"
        )
        lines.append(f'"{about}"')

    # Focus areas
    focus = s.get("focus_areas", [])
    if focus:
        lines.append(
            f"\n- The user has flagged these as their current focus areas: "
            f"{', '.join(focus)}. Weight your responses to be more attentive to these themes."
        )

    # Tone
    tone = s.get("ai_tone", "warm")
    tone_map = {
        "warm":     "Speak with warmth, gentleness, and care. Be patient and emotionally supportive. This is your default.",
        "direct":   "Be honest and concise. Avoid over-softening or filler phrases. Get to the point while remaining kind.",
        "clinical": "Use a structured, CBT-informed approach. Be methodical and clear. Less personal warmth, more practical framing.",
        "playful":  "Be relaxed and conversational. Light humor is welcome. Less formal, more like a trusted friend.",
    }
    if tone in tone_map:
        lines.append(f"\nCOMMUNICATION STYLE: {tone_map[tone]}")

    # Response length
    length = s.get("response_length", "medium")
    length_map = {
        "short":  "Keep responses SHORT — 2 to 3 sentences maximum unless the situation genuinely demands more. Err toward brevity.",
        "medium": "Balance response length to the question — short for casual things, longer when the topic deserves depth.",
        "long":   "Give thorough, full responses. Explore ideas and reflections completely. The user prefers depth.",
    }
    if length in length_map:
        lines.append(f"RESPONSE LENGTH: {length_map[length]}")

    # Crisis sensitivity
    crisis = s.get("crisis_sensitivity", "standard")
    crisis_map = {
        "low":      "CRISIS SENSITIVITY: Only escalate to crisis mode for very clear, explicit statements of intent. Be less likely to flag passive mentions of distress.",
        "standard": "CRISIS SENSITIVITY: Use standard detection. Flag clear signs of distress as normal.",
        "high":     "CRISIS SENSITIVITY: Be more vigilant. Flag subtle signs of distress earlier, offer more frequent check-ins, and gently probe when something feels heavy.",
    }
    if crisis in crisis_map:
        lines.append(crisis_map[crisis])

    lines.append("═══════════════════════════════════════════════")
    return "\n".join(lines)


# ── User context builder (settings-aware) ────────────────────────────────────

def _get_user_context(user_id: str, db: Session, user_settings: dict | None = None) -> str:
    """Build context string, honouring the context-toggle flags in settings."""
    s = user_settings or {}

    # Defaults: include everything unless settings say otherwise
    include_mood       = s.get("use_mood_context", True)
    include_screening  = s.get("use_screening_context", True)
    include_cbt        = s.get("use_cbt_context", True)
    include_memory     = s.get("use_memory_context", True)
    include_journal    = s.get("use_journal_context", True)

    try:
        screening_history = []
        if include_screening:
            screening_rows = (
                db.query(ScreeningResult)
                .filter(ScreeningResult.user_id == user_id)
                .order_by(ScreeningResult.completed_at.desc())
                .limit(6).all()
            )
            screening_history = [
                {"type": r.type, "score": r.score, "severity": r.severity}
                for r in screening_rows
            ]

        memory_history = []
        if include_memory:
            import json as _json
            memory_rows = (
                db.query(CognitiveTestResult)
                .filter(CognitiveTestResult.user_id == user_id)
                .order_by(CognitiveTestResult.completed_at.desc())
                .limit(20).all()
            )
            for r in memory_rows:
                try:   scores = _json.loads(r.score_data) if r.score_data else {}
                except: scores = {}
                try:   rounds = _json.loads(r.raw_results) if r.raw_results else []
                except: rounds = []
                memory_history.append({
                    "game_type":    r.test_type,
                    "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                    "scores":       scores,
                    "rounds":       rounds,
                })

        mood_history = []
        if include_mood:
            mood_rows = (
                db.query(MoodLog)
                .filter(MoodLog.user_id == user_id)
                .order_by(MoodLog.created_at.desc())
                .limit(10).all()
            )
            mood_history = [{"score": m.score, "note": m.note} for m in mood_rows]

        cbt_modules = []
        if include_cbt:
            cbt_rows = db.query(CBTProgress).filter(CBTProgress.user_id == user_id).all()
            completed_ids = {r.module_id for r in cbt_rows}
            all_modules   = ["distortion", "reframing", "activation", "esteem", "exposure", "habit"]
            cbt_modules   = [{"id": mid, "completed": mid in completed_ids} for mid in all_modules]

        journal_count  = 0
        journal_tags   = []
        if include_journal:
            journal_count = (
                db.query(JournalEntry).filter(JournalEntry.user_id == user_id).count()
            )
            recent_journals = (
                db.query(JournalEntry)
                .filter(JournalEntry.user_id == user_id)
                .order_by(JournalEntry.created_at.desc())
                .limit(5).all()
            )
            journal_tags = list({tag for j in recent_journals for tag in (j.tags or [])})

        from models.database import InsightSummary
        summary_rows = (
            db.query(InsightSummary)
            .filter(InsightSummary.user_id == user_id)
            .order_by(InsightSummary.created_at.desc())
            .limit(3).all()
        )
        insight_summaries = [{"title": sr.title, "content": sr.content} for sr in summary_rows]

        user      = db.query(User).filter(User.id == user_id).first()
        # Prefer preferred_name from settings over full_name
        user_name = s.get("preferred_name", "").strip() or (user.full_name if user else None)

        return build_user_context(
            screening_history=screening_history,
            memory_history=memory_history,
            mood_history=mood_history,
            cbt_modules=cbt_modules,
            journal_count=journal_count,
            journal_tags=journal_tags,
            insight_summaries=insight_summaries,
            user_name=user_name,
        )
    except Exception as e:
        print(f"[Chat context error] {type(e).__name__}: {e}")
        return ""


def _get_or_create_convo(data: MessageRequest, user_id: str, db: Session) -> Conversation:
    if data.conversation_id:
        convo = db.query(Conversation).filter(
            Conversation.id == data.conversation_id,
            Conversation.user_id == user_id,
        ).first()
        if not convo:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return convo
    convo = Conversation(user_id=user_id, title=data.content.strip()[:40])
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


# ── Conversation CRUD ─────────────────────────────────────────────────────────

@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convos = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(desc(Conversation.updated_at))
        .all()
    )
    return [{"id": c.id, "title": c.title, "updated_at": c.updated_at} for c in convos]


@router.post("/conversations")
def create_conversation(
    data: NewConversationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = Conversation(user_id=current_user.id, title=data.title or "New conversation")
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return {"id": convo.id, "title": convo.title, "updated_at": convo.updated_at}


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id,
    ).first()
    require_owner(convo, current_user_id=current_user.id, resource_name="Conversation")

    messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.user_id == current_user.id,
        )
        .order_by(ChatMessage.created_at)
        .all()
    )
    return {
        "id":       convo.id,
        "title":    convo.title,
        "messages": [
            {"role": m.role, "content": m.content, "created_at": m.created_at}
            for m in messages
        ],
    }


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    require_owner(convo, current_user_id=current_user.id, resource_name="Conversation")
    db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id,
        ChatMessage.user_id == current_user.id,
    ).delete()
    db.delete(convo)
    db.commit()
    return {"ok": True}


# ── Streaming chat ────────────────────────────────────────────────────────────

@router.post("/stream")
async def stream_message(
    data: MessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    convo      = _get_or_create_convo(data, current_user.id, db)
    risk        = await detect_risk_full(data.content)
    risk_level  = risk["level"]

    if risk_level >= 1:
        log_content = f"[model={risk['classifier_level']} kw={risk['keyword_level']}] {data.content[:480]}"
        db.add(CrisisLog(user_id=current_user.id, level=risk_level, content=log_content))
        db.commit()

    if risk_level >= 3:
        async def crisis_stream():
            msg = (
                "Your safety is the only thing that matters right now. "
                "Please call emergency services (112 or 911) immediately, "
                "or contact iCall at 9152987821. You are not alone."
            )
            yield f"data: {json.dumps({'text': msg})}\n\n"
            yield f"data: {json.dumps({'conversation_id': str(convo.id), 'risk_level': risk_level})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(
            crisis_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    db.add(ChatMessage(
        conversation_id=convo.id, user_id=current_user.id, role="user", content=data.content
    ))
    db.commit()

    history_rows = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.conversation_id == convo.id,
            ChatMessage.user_id == current_user.id,
        )
        .order_by(ChatMessage.created_at)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in history_rows]

    # Load settings and build context / prompt additions
    user_settings          = _get_user_settings(current_user.id, db)
    user_context           = _get_user_context(current_user.id, db, user_settings)
    settings_prompt        = _build_settings_prompt(user_settings)
    priority_prompt        = wellbeing.priority_block(current_user.id, db) + await emotion.signal_block(data.content)

    async def generate():
        full_response = ""
        try:
            async for token in chat_with_llama_stream(
                data.content, history,
                risk_level=risk_level,
                user_context=user_context,
                settings_prompt=settings_prompt,
                priority_prompt=priority_prompt,
            ):
                full_response += token
                if risk_level < 1:
                    yield f"data: {json.dumps({'text': token})}\n\n"
        except Exception as e:
            error_msg = "Something went wrong mid-response. Please try again."
            if risk_level < 1:
                yield f"data: {json.dumps({'text': error_msg})}\n\n"
            full_response = full_response or error_msg

        tool_redirect = None
        tool_match    = re.search(r'TOOL_REDIRECT:(\{[^}]+\})', full_response)
        if tool_match:
            try:
                tool_redirect = json.loads(tool_match.group(1))
                full_response = full_response[:tool_match.start()].strip()
            except Exception:
                pass

        full_response = post_process_response(full_response, risk_level)

        reviewed = False
        if risk_level >= 1:
            edited = await review_reply(data.content, full_response, risk_level)
            if edited:
                full_response = edited
                reviewed = True
            yield f"data: {json.dumps({'text': full_response})}\n\n"

        try:
            db.add(ChatMessage(
                conversation_id=convo.id,
                user_id=current_user.id,
                role="assistant",
                content=full_response,
            ))
            convo.updated_at = datetime.utcnow()
            db.commit()
        except Exception as e:
            print(f"[Chat/stream] DB save error: {type(e).__name__}: {e}")
            db.rollback()

        wellbeing.schedule_chat_review(current_user.id, str(convo.id))

        yield f"data: {json.dumps({'conversation_id': str(convo.id), 'risk_level': risk_level, 'tool_redirect': tool_redirect, 'reviewed': reviewed})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Non-streaming fallback ────────────────────────────────────────────────────

@router.post("/message")
async def send_message(
    data: MessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    convo      = _get_or_create_convo(data, current_user.id, db)
    risk        = await detect_risk_full(data.content)
    risk_level  = risk["level"]

    if risk_level >= 1:
        log_content = f"[model={risk['classifier_level']} kw={risk['keyword_level']}] {data.content[:480]}"
        db.add(CrisisLog(user_id=current_user.id, level=risk_level, content=log_content))
        db.commit()

    if risk_level >= 3:
        return {
            "response": (
                "Your safety is the only thing that matters right now. "
                "Please call emergency services (112 or 911) immediately, "
                "or contact iCall at 9152987821. You are not alone."
            ),
            "risk_level":       risk_level,
            "conversation_id":  convo.id,
            "tool_redirect":    None,
        }

    db.add(ChatMessage(
        conversation_id=convo.id, user_id=current_user.id, role="user", content=data.content
    ))

    history_rows = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.conversation_id == convo.id,
            ChatMessage.user_id == current_user.id,
        )
        .order_by(ChatMessage.created_at)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in history_rows]

    user_settings   = _get_user_settings(current_user.id, db)
    user_context    = _get_user_context(current_user.id, db, user_settings)
    settings_prompt = _build_settings_prompt(user_settings)
    priority_prompt = wellbeing.priority_block(current_user.id, db) + await emotion.signal_block(data.content)

    response = await chat_with_llama(
        data.content, history, risk_level,
        user_context=user_context,
        settings_prompt=settings_prompt,
        priority_prompt=priority_prompt,
    )
    response = post_process_response(response, risk_level)
    reviewed = False
    if risk_level >= 1:
        edited = await review_reply(data.content, response, risk_level)
        if edited:
            response = edited
            reviewed = True

    tool_redirect = None
    tool_match    = re.search(r'TOOL_REDIRECT:(\{[^}]+\})', response)
    if tool_match:
        try:
            tool_redirect = json.loads(tool_match.group(1))
            response      = response[:tool_match.start()].strip()
        except Exception:
            pass

    db.add(ChatMessage(
        conversation_id=convo.id, user_id=current_user.id, role="assistant", content=response
    ))
    convo.updated_at = datetime.utcnow()
    db.commit()

    wellbeing.schedule_chat_review(current_user.id, str(convo.id))

    return {
        "response":         response,
        "risk_level":       risk_level,
        "conversation_id":  convo.id,
        "tool_redirect":    tool_redirect,
        "reviewed":         reviewed,
    }