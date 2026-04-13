# backend/routers/chat.py  (ownership-hardened version)
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
    detect_risk_level, post_process_response, build_user_context,
)
from middleware.ownership import require_owner
from datetime import datetime
import json, re

router = APIRouter(prefix="/api/chat", tags=["chat"])


class MessageRequest(BaseModel):
    content: str
    history: list[dict] = []
    conversation_id: str | None = None


class NewConversationRequest(BaseModel):
    title: str | None = None


# ── User context builder ──────────────────────────────────────────────────────
def _get_user_context(user_id: str, db: Session) -> str:
    try:
        screening_rows = (
            db.query(ScreeningResult)
            .filter(ScreeningResult.user_id == user_id)
            .order_by(ScreeningResult.completed_at.desc())
            .limit(6).all()
        )
        screening_history = [{"type": r.type, "score": r.score, "severity": r.severity} for r in screening_rows]

        import json as _json
        memory_rows = (
            db.query(CognitiveTestResult)
            .filter(CognitiveTestResult.user_id == user_id)
            .order_by(CognitiveTestResult.completed_at.desc())
            .limit(20).all()
        )
        memory_history = []
        for r in memory_rows:
            try:   scores = _json.loads(r.score_data) if r.score_data else {}
            except: scores = {}
            try:   rounds = _json.loads(r.raw_results) if r.raw_results else []
            except: rounds = []
            memory_history.append({
                "game_type": r.test_type,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "scores": scores,
                "rounds": rounds,
            })

        mood_rows = (
            db.query(MoodLog)
            .filter(MoodLog.user_id == user_id)
            .order_by(MoodLog.created_at.desc())
            .limit(10).all()
        )
        mood_history = [{"score": m.score, "note": m.note} for m in mood_rows]

        cbt_rows = db.query(CBTProgress).filter(CBTProgress.user_id == user_id).all()
        completed_ids = {r.module_id for r in cbt_rows}
        all_modules = ["distortion", "reframing", "activation", "esteem", "exposure", "habit"]
        cbt_modules = [{"id": mid, "completed": mid in completed_ids} for mid in all_modules]

        journal_count = db.query(JournalEntry).filter(JournalEntry.user_id == user_id).count()
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
        insight_summaries = [{"title": s.title, "content": s.content} for s in summary_rows]

        user = db.query(User).filter(User.id == user_id).first()
        user_name = user.full_name if user else None

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
        # IDOR guard — only fetch if it belongs to this user
        convo = db.query(Conversation).filter(
            Conversation.id == data.conversation_id,
            Conversation.user_id == user_id,          # ← ownership enforced in query
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
        .filter(Conversation.user_id == current_user.id)   # only this user's convos
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
        Conversation.user_id == current_user.id,   # IDOR guard
    ).first()
    require_owner(convo, current_user_id=current_user.id, resource_name="Conversation")

    messages = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.conversation_id == conversation_id,
            ChatMessage.user_id == current_user.id,   # belt-and-suspenders
        )
        .order_by(ChatMessage.created_at)
        .all()
    )
    return {
        "id": convo.id,
        "title": convo.title,
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
    convo = db.query(Conversation).filter(
        Conversation.id == conversation_id,
    ).first()
    require_owner(convo, current_user_id=current_user.id, resource_name="Conversation")

    # Only delete messages that also belong to this user
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
    risk_level = detect_risk_level(data.content)

    if risk_level >= 1:
        db.add(CrisisLog(user_id=current_user.id, level=risk_level, content=data.content[:500]))
        db.commit()

    if risk_level >= 3:
        async def crisis_stream():
            msg = ("Your safety is the only thing that matters right now. "
                   "Please call emergency services (112 or 911) immediately, "
                   "or contact iCall at 9152987821. You are not alone.")
            yield f"data: {json.dumps({'text': msg})}\n\n"
            yield f"data: {json.dumps({'conversation_id': str(convo.id), 'risk_level': risk_level})}\n\n"
            yield "data: [DONE]\n\n"
        return StreamingResponse(crisis_stream(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    db.add(ChatMessage(conversation_id=convo.id, user_id=current_user.id, role="user", content=data.content))
    db.commit()

    # Build history from DB (only this user's messages) — never trust client-supplied history
    history_rows = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.conversation_id == convo.id,
            ChatMessage.user_id == current_user.id,
        )
        .order_by(ChatMessage.created_at)
        .all()
    )
    history      = [{"role": m.role, "content": m.content} for m in history_rows]
    user_context = _get_user_context(current_user.id, db)

    async def generate():
        full_response = ""
        try:
            async for token in chat_with_llama_stream(
                data.content, history, risk_level=risk_level, user_context=user_context
            ):
                full_response += token
                yield f"data: {json.dumps({'text': token})}\n\n"
        except Exception as e:
            error_msg = "Something went wrong mid-response. Please try again."
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

        try:
            db.add(ChatMessage(
                conversation_id = convo.id,
                user_id         = current_user.id,
                role            = "assistant",
                content         = full_response,
            ))
            convo.updated_at = datetime.utcnow()
            db.commit()
        except Exception as e:
            print(f"[Chat/stream] DB save error: {type(e).__name__}: {e}")
            db.rollback()

        yield f"data: {json.dumps({'conversation_id': str(convo.id), 'risk_level': risk_level, 'tool_redirect': tool_redirect})}\n\n"
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
    risk_level = detect_risk_level(data.content)

    if risk_level >= 1:
        db.add(CrisisLog(user_id=current_user.id, level=risk_level, content=data.content[:500]))
        db.commit()

    if risk_level >= 3:
        return {
            "response": ("Your safety is the only thing that matters right now. "
                         "Please call emergency services (112 or 911) immediately, "
                         "or contact iCall at 9152987821. You are not alone."),
            "risk_level": risk_level,
            "conversation_id": convo.id,
            "tool_redirect": None,
        }

    db.add(ChatMessage(conversation_id=convo.id, user_id=current_user.id, role="user", content=data.content))

    history_rows = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.conversation_id == convo.id,
            ChatMessage.user_id == current_user.id,
        )
        .order_by(ChatMessage.created_at)
        .all()
    )
    history      = [{"role": m.role, "content": m.content} for m in history_rows]
    user_context = _get_user_context(current_user.id, db)

    response     = await chat_with_llama(data.content, history, risk_level, user_context=user_context)
    response     = post_process_response(response, risk_level)

    tool_redirect = None
    tool_match    = re.search(r'TOOL_REDIRECT:(\{[^}]+\})', response)
    if tool_match:
        try:
            tool_redirect = json.loads(tool_match.group(1))
            response      = response[:tool_match.start()].strip()
        except Exception:
            pass

    db.add(ChatMessage(conversation_id=convo.id, user_id=current_user.id, role="assistant", content=response))
    convo.updated_at = datetime.utcnow()
    db.commit()

    return {
        "response": response,
        "risk_level": risk_level,
        "conversation_id": convo.id,
        "tool_redirect": tool_redirect,
    }
