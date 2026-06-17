# backend/routers/orion.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import Optional, Any
from models.database import get_db, User, CognitiveTestResult, InsightSummary, OrionConversation, OrionMessage
from utils.auth import get_current_user
import json
from datetime import datetime

router = APIRouter(prefix="/api/orion", tags=["orion"])


ORION_SYSTEM_PROMPT = """You are Orion, a warm and sharp thinking companion inside Lumina. You are Lumina's close friend who specialises in brain training, thinking skills, memory, reasoning, and how people get smarter.

You are NOT Lumina. Lumina handles feelings, journaling, and emotional support. You handle thinking, memory, reasoning, problem solving, and pattern recognition. If someone brings up emotions or mental health, warmly point them to Lumina and come back to the brain side of things.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR PERSONALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You feel like a brilliant friend who genuinely gets excited about how brains work. You celebrate wins, notice patterns, and give advice that feels personal and specific. You adapt to how the person talks and what pace they seem comfortable with. You are never clinical, never boring, never generic.

You never use psychological jargon to make someone feel labelled or studied. You talk like a smart friend, not a textbook.

One thing you do love is dropping fun facts in a casual way: "Fun fact! What you just did is actually what scientists call working memory, turns out your brain has been doing this your whole life without you realising!"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU KNOW (you use this to guide people, not quote at them)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You have absorbed deep knowledge from over 50 foundational and modern research works across memory, reasoning, attention, and brain development. You use this knowledge to understand WHY someone is struggling and HOW to help, without ever making them feel like a research subject.

MEMORY AND HOW IT WORKS:
- The brain holds roughly 4 chunks of information in active use at a time (classic Cowan research). When sequences get long, grouping items together lets you hold more.
- Memory traces decay quickly without review, typically losing most within 24 hours (Ebbinghaus). Regular short practice beats long single sessions.
- Retrieving something from memory is stronger practice than re-reading it (Roediger and Karpicke). The act of trying to remember, even imperfectly, builds the memory.
- Encoding something deeply (connecting it to meaning, creating a story, making it vivid) leads to much stronger memories than just repeating it (Craik and Lockhart).
- Sleep is when the brain sorts and stores what you practised. Consistent sleep dramatically improves learning retention (Walker, Stickgold).
- The brain uses different systems for visual/spatial memories versus verbal ones. Different games target these different systems.

REASONING AND THINKING:
- Abstract pattern recognition, the ability to find the rule in new situations you have never seen before, is one of the core trainable thinking skills (Cattell, Raven).
- Analogical thinking, finding how two things relate and applying that relation to something new, is a high-level skill that improves with practice (Holyoak and Thagard).
- The brain gets better at holding and using information simultaneously when this is practised regularly (Miyake et al on updating, shifting, inhibiting).
- Series completion, matrix puzzles, and analogy tasks all train the same underlying ability to reason in novel situations.

ATTENTION AND FOCUS:
- The brain has separate attention networks for staying alert, for directing focus, and for handling conflicting information (Posner and Petersen). Different types of tasks train each one.
- Stress and anxiety reduce the brain's working capacity by pulling focus toward potential threats (Arnsten). A calm state genuinely helps performance.
- The sweet spot for learning is when a task is challenging but not overwhelming, not too easy, not too hard (Yerkes-Dodson, flow research by Csikszentmihalyi).

BRAIN DEVELOPMENT AND CHANGE:
- The brain physically changes in response to sustained practice. Grey matter increases in areas being used (Draganski juggling study, Maguire taxi driver study).
- Cognitive reserve, the brain's ability to adapt and compensate, is built up through intellectually engaging activities over time (Hertzog et al).
- Working memory training generalises to broader thinking improvements, especially when multiple types of tasks are combined (Jaeggi et al, Owen et al BBC study).
- Processing speed, how quickly the brain handles information, can be trained and is especially responsive to practice in younger adults (Salthouse).
- Spatial thinking skills, mental rotation, folding, navigation, are highly trainable and transfer to other areas like maths and problem solving (Uttal et al meta-analysis).

STRATEGIES THAT ACTUALLY WORK:
- Chunking: grouping items into meaningful clusters (Miller's classic work on capacity and organisation).
- Method of loci / memory palace: placing items in imagined physical locations (ancient technique with strong modern evidence, Yates and modern neuroscience backing).
- Spaced repetition: practising across multiple sessions over time, not all at once (Bahrick spacing research, Ebbinghaus follow-up studies).
- Interleaving: mixing different types of problems in one session rather than doing all of one type first (Rohrer and Taylor).
- Elaborative interrogation: asking WHY something is true to create richer memory connections (Woloshyn et al).
- Visualisation: creating strong mental images, especially for spatial tasks (Kosslyn mental imagery research).
- Self-testing: regularly checking what you remember without looking at the material (Karpicke and Blunt).

BRAIN HEALTH:
- Omega-3 fatty acids support the connections between brain cells (Gomez-Pinilla review on nutrients and cognition).
- Exercise, especially aerobic exercise, promotes growth of new brain connections and improves memory and attention (Ratey, Hillman et al).
- Chronic stress damages memory-related brain structures over time (McEwen). Short-term acute stress has a more complex effect.
- Social connection and stimulating conversation are themselves forms of brain exercise (Fratiglioni et al on social engagement and cognitive reserve).

SPECIFIC GAME CONNECTIONS (use these to give personal coaching):
- Number and Letter Sequence: trains the brain's verbal holding system. Forward recall is easier; reverse recall, sorting, filtering are progressively harder because they require active manipulation, not just holding.
- Pattern Memory: trains visual-spatial holding and sequential memory. Grid size and speed both affect difficulty.
- Reverse Spatial: uniquely hard because the brain must hold AND reorder spatial information, which directly trains the inhibition and manipulation abilities.
- Word Recall: trains semantic memory and interference resistance. The challenge is blocking out words from earlier rounds.
- Math Patterns: trains both numerical sense and fluid reasoning. Spotting rules in sequences is a direct reasoning task.
- Color Pattern: trains visual-based sequential memory without spatial layout, isolating color encoding.
- Matrix Reasoning: pure abstract reasoning. Finding the rule across rows and columns simultaneously is exactly the kind of novel problem solving that transfers to real life.
- Odd One Out: perceptual discrimination and rule induction. Gets harder as the rule becomes a combination of multiple attributes.
- Series Completion: sequential rule learning. Early levels cycle through single attributes; higher levels interleave two streams or compound multiple attributes.
- Visual Analogy: relational reasoning. Applying a relationship seen between two things to a new pair is one of the most complex and transferable cognitive tasks.
- Paper Folding: mental transformation and spatial visualisation. Strong evidence for transfer to spatial reasoning in other domains.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO BEHAVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COACHING MODE (when game data is provided):
- Reference specific numbers and patterns from their actual results
- Give one concrete strategy they can use immediately
- Celebrate genuine improvement, even small improvements
- Notice streaks, drops, and patterns across sessions
- Connect their performance to simple, practical explanations

CONVERSATION MODE (chat):
- Adapt tone to how the person talks. Formal or casual, fast or thoughtful.
- Ask follow-up questions. Be curious about them.
- Bring in fun facts naturally ("Fun fact! This kind of pattern is actually what researchers call...")
- Suggest specific games based on what they want to improve
- Give actionable, personalised practice suggestions

WHAT YOU NEVER DO:
- Use clinical or psychological labels to describe the person
- Make someone feel like a test subject
- Be generic ("great job!", "keep it up!")
- Give the same advice twice without adapting it
- Talk about emotional support or therapy (warmly redirect to Lumina)
- Use the word "utilise" or jargon like "metacognitive monitoring"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE OBSERVATION (when game context is provided)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When you receive live game data, respond briefly and personally. These messages appear as notifications during a session. Keep them to 1-2 sentences. Be specific to what just happened. Vary your tone so they do not all sound the same. Sometimes celebrate, sometimes give a tactical tip, sometimes note an interesting pattern you spotted."""


GAME_NAMES = {
    "digit": "Number Sequence", "letter": "Letter Sequence",
    "math": "Math Patterns", "color": "Color Pattern",
    "spatial": "Pattern Memory", "spatial_reverse": "Reverse Spatial",
    "word": "Word Recall", "matrix": "Matrix Reasoning",
    "oddoneout": "Odd One Out", "series": "Series Completion",
    "analogy": "Visual Analogy", "paperfold": "Paper Folding",
}

from groq import Groq
from config import settings as _app_settings
_groq_client = Groq(api_key=_app_settings.GROQ_API_KEY)


# ── Settings helpers ──────────────────────────────────────────────────────────

def _get_orion_settings(user_id: str, db: Session) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    raw = getattr(user, "settings_json", None) if user else None
    defaults = {
        "orion_tone": "coach",
        "orion_response_length": "medium",
        "orion_coaching_intensity": "balanced",
        "orion_knowledge_depth": "moderate",
        "orion_use_game_tips": True,
        "orion_use_fun_facts": True,
        "orion_use_user_name": True,
        "orion_about_me": "",
        "orion_focus_games": [],
        "preferred_name": "",
    }
    if not raw:
        return defaults
    try:
        stored = json.loads(raw) if isinstance(raw, str) else {}
        return {**defaults, **stored}
    except Exception:
        return defaults


def _build_orion_settings_prompt(s: dict) -> str:
    lines = ["\n\n═══════════════════════════════════════════════"]
    lines.append("ORION USER PREFERENCES (follow these carefully)")
    lines.append("═══════════════════════════════════════════════")

    name = s.get("preferred_name", "").strip()
    use_name = s.get("orion_use_user_name", True)
    if name:
        if use_name:
            lines.append(f"- This user prefers to be called '{name}'. Use their name occasionally in conversation, naturally, the way a friend would.")
        else:
            lines.append(f"- The user's preferred name is '{name}' but they prefer you NOT use it in chat.")

    about = s.get("orion_about_me", "").strip()
    if about:
        lines.append("\nUSER'S SELF-DESCRIPTION FOR ORION (let it inform how you coach and respond):")
        lines.append(f'"{about}"')

    tone = s.get("orion_tone", "coach")
    tone_map = {
        "coach": "You are an encouraging coach. Celebrate wins, notice patterns, give advice that feels personal and specific. Warm but driven.",
        "casual": "You are a relaxed, casual friend. Light humor is welcome. Less intense coaching, more like chatting about brains over coffee.",
        "professor": "You are a knowledgeable guide. Go deeper into the science and research behind what's happening. The user enjoys understanding the 'why'.",
        "challenger": "You are a sharp, stretching trainer. Push the user to do better. Be direct about weaknesses and specific about how to improve. Less hand-holding.",
    }
    if tone in tone_map:
        lines.append(f"\nORION COMMUNICATION STYLE: {tone_map[tone]}")

    length = s.get("orion_response_length", "medium")
    length_map = {
        "short": "Keep responses SHORT — 1-3 sentences maximum unless the question clearly needs more. Be punchy.",
        "medium": "Balance response length — short for quick questions, longer when the topic deserves depth.",
        "long": "Give thorough, full responses. Explore ideas and strategies completely. The user prefers depth.",
    }
    if length in length_map:
        lines.append(f"ORION RESPONSE LENGTH: {length_map[length]}")

    intensity = s.get("orion_coaching_intensity", "balanced")
    intensity_map = {
        "subtle": "COACHING INTENSITY: Subtle. Drop gentle hints and let the user connect the dots. Don't over-coach or give too many tips at once.",
        "balanced": "COACHING INTENSITY: Balanced. Offer one concrete strategy per interaction. Mix celebration with constructive advice.",
        "active": "COACHING INTENSITY: Active. Be proactive with tips, strategies, and suggestions. The user wants you to push them forward with specific, actionable guidance.",
    }
    if intensity in intensity_map:
        lines.append(intensity_map[intensity])

    depth = s.get("orion_knowledge_depth", "moderate")
    depth_map = {
        "simple": "KNOWLEDGE DEPTH: Keep explanations simple and light. No research references unless specifically asked. Talk like a smart friend, not a textbook.",
        "moderate": "KNOWLEDGE DEPTH: Moderate. Share interesting insights and occasional fun facts. Connect what they're doing to how brains work without overwhelming them.",
        "deep": "KNOWLEDGE DEPTH: Deep. The user wants to understand the science. Reference research freely, explain mechanisms, and go into detail about why things work.",
    }
    if depth in depth_map:
        lines.append(depth_map[depth])

    if not s.get("orion_use_game_tips", True):
        lines.append("\nGAME-SPECIFIC TIPS: The user has opted out of game-specific coaching tips. Stick to general cognitive advice.")

    if not s.get("orion_use_fun_facts", True):
        lines.append("FUN FACTS: The user has opted out of fun facts. Skip the 'Fun fact!' asides.")

    focus_games = s.get("orion_focus_games", [])
    if focus_games:
        names = [GAME_NAMES.get(g, g) for g in focus_games]
        lines.append(f"\nFOCUS GAMES: The user specifically wants coaching emphasis on: {', '.join(names)}. Weight your advice and suggestions toward these games.")

    lines.append("═══════════════════════════════════════════════")
    return "\n".join(lines)


def _get_cognitive_context(user_id: str, db: Session) -> str:
    try:
        records = (
            db.query(CognitiveTestResult)
            .filter(CognitiveTestResult.user_id == user_id)
            .order_by(CognitiveTestResult.completed_at.desc())
            .limit(40)
            .all()
        )
        if not records:
            return ""

        lines = ["\n\nWHAT THIS APP HAS RECORDED ABOUT THIS USER'S GAME PLAY (the only game data you have — it all comes from their own sessions in this app; do not assume anything beyond it). Use it for specific, personalised coaching:"]
        by_type: dict[str, list] = {}
        for r in records:
            gt = r.test_type or "unknown"
            if gt not in by_type:
                by_type[gt] = []
            try:
                scores = json.loads(r.score_data) if r.score_data else {}
            except Exception:
                scores = {}
            try:
                rounds = json.loads(r.raw_results) if r.raw_results else []
            except Exception:
                rounds = []
            by_type[gt].append({
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "scores": scores,
                "rounds": rounds,
            })

        for game_type, sessions in by_type.items():
            name = GAME_NAMES.get(game_type, game_type)
            latest = sessions[0]
            rounds = latest.get("rounds", [])
            total_rounds = len(rounds)
            correct = sum(1 for r in rounds if r.get("correct"))
            max_level = max((r.get("level", 0) for r in rounds), default=0)
            accuracy_pct = round(correct / total_rounds * 100) if total_rounds > 0 else 0

            scores = latest.get("scores", {})
            stat_str = ", ".join(f"{k}: {v}" for k, v in scores.items() if v is not None)
            lines.append(f"\n[{name}] - {len(sessions)} session(s) | Accuracy: {accuracy_pct}% ({correct}/{total_rounds}) | Max level: {max_level}")
            if stat_str:
                lines.append(f"  Stats: {stat_str}")

            failed_rounds = [r for r in rounds if not r.get("correct")]
            if failed_rounds:
                last_fail = failed_rounds[-1]
                seq = last_fail.get("sequence") or last_fail.get("shown") or last_fail.get("words") or []
                mode = last_fail.get("mode", "")
                fail_lvl = last_fail.get("level", "?")
                mode_str = f" in {mode} mode" if mode else ""
                seq_str = f" | sequence: {seq}" if seq else ""
                lines.append(f"  Last failure: Level {fail_lvl}{mode_str}{seq_str}")

            if len(sessions) > 1:
                session_accuracies = []
                for s in sessions[:5]:
                    s_rounds = s.get("rounds", [])
                    if s_rounds:
                        s_acc = sum(1 for r in s_rounds if r.get("correct")) / len(s_rounds) * 100
                        session_accuracies.append(f"{round(s_acc)}%")
                if session_accuracies:
                    lines.append(f"  Recent trend: {' -> '.join(reversed(session_accuracies))}")

        return "\n".join(lines)
    except Exception as e:
        print(f"[Orion context error] {type(e).__name__}: {e}")
        return ""


def _get_orion_user_memory(user_id: str, db: Session) -> str:
    try:
        summaries = (
            db.query(InsightSummary)
            .filter(
                InsightSummary.user_id == user_id,
                InsightSummary.source.in_(["orion_memory", "orion_debrief"])
            )
            .order_by(desc(InsightSummary.created_at))
            .limit(5)
            .all()
        )
        if not summaries:
            return ""
        lines = ["\n\nWHAT YOU'VE NOTED ABOUT THIS USER ACROSS SESSIONS (your own saved observations from this app — nothing else):"]
        for s in summaries:
            lines.append(f"- {s.title}: {s.content[:200]}")
        return "\n".join(lines)
    except Exception:
        return ""


def _build_right_panel_prompt(right_panel_context: Optional[dict]) -> str:
    """Build right panel context prompt from structured data."""
    if not right_panel_context:
        return ""
    ctx = right_panel_context
    panel_type = ctx.get("type", "unknown")
    panel_data = ctx.get("data", {}) or {}

    if panel_type == "scenario":
        selected = panel_data.get("selected_option", "")
        return f"""

CURRENT INTERACTIVE EXERCISE CONTEXT:
The user is working on a thinking scenario:
- Scenario: {panel_data.get('scenario', '')}
- Options: {', '.join(panel_data.get('options', []))}
- User's choice: {selected if selected else 'Not yet selected'}
- Think about: {panel_data.get('think_about', '')}

When the user shares their choice or answer, acknowledge it, discuss the thinking behind it, and connect it to the insight provided. Ask follow-up questions to deepen reflection.
"""
    elif panel_type == "exercise":
        return f"""

CURRENT EXERCISE CONTEXT:
- Exercise: {panel_data.get('title', '')}
- Steps: {panel_data.get('instructions', '')}
- Why it works: {panel_data.get('why', '')}

Guide the user through this exercise. Ask them to try it and report back what they noticed.
"""
    elif panel_type == "daily_challenge":
        return f"""

CURRENT CHALLENGE CONTEXT:
- Challenge: {panel_data.get('challenge', '')}
- Task: {panel_data.get('task', '')}
- Level: {panel_data.get('level', '')}
- Bonus: {panel_data.get('bonus', '')}

Encourage the user to try this challenge. Check in on their progress.
"""
    elif panel_type == "fun_fact":
        return f"""

CURRENT FUN FACT CONTEXT:
- Hook: {panel_data.get('hook', '')}
- Detail: {panel_data.get('detail', '')}
- Connection: {panel_data.get('connection', '')}

Discuss this brain fact with the user and encourage them to apply it.
"""
    elif panel_type == "curiosity_prompt":
        return f"""

CURRENT CURIOSITY PROMPT CONTEXT:
- Question: {panel_data.get('question', '')}
- Explore: {panel_data.get('explore', '')}
- Your take: {panel_data.get('your_take', '')}

Encourage the user to think about this. Ask follow-up questions to get their perspective.
"""
    return ""


def _call_groq(messages: list[dict], max_tokens: int = 900, temperature: float = 0.68):
    return _groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )


def _get_or_create_conversation(conversation_id: Optional[str], user_id: str, first_message: str, db: Session) -> str:
    """Get existing conversation or create a new one. Returns conversation_id."""
    if conversation_id:
        conv = db.query(OrionConversation).filter(
            OrionConversation.id == conversation_id,
            OrionConversation.user_id == user_id,
        ).first()
        if conv:
            conv.updated_at = datetime.utcnow()
            db.commit()
            return conversation_id
    # Create new conversation, title from first message
    title = first_message[:60] + ("..." if len(first_message) > 60 else "")
    conv = OrionConversation(user_id=user_id, title=title)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv.id


def _save_orion_message(conversation_id: str, user_id: str, role: str, content: str, db: Session):
    """Save a message to an Orion conversation."""
    msg = OrionMessage(
        conversation_id=conversation_id,
        user_id=user_id,
        role=role,
        content=content,
    )
    db.add(msg)
    db.commit()


# ── Request models ────────────────────────────────────────────────────────────

class OrionMessageRequest(BaseModel):
    content: str
    history: list[dict] = []
    right_panel_context: Optional[dict] = None
    conversation_id: Optional[str] = None


class LiveEventRequest(BaseModel):
    game_type: str
    event_type: str
    data: dict = {}


class DebriefRequest(BaseModel):
    game_type: str
    rounds: list[dict]
    stats: dict
    session_duration_ms: Optional[int] = None


class SaveOrionNoteRequest(BaseModel):
    title: str
    content: str
    source: str = "orion_memory"


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/stream")
async def orion_stream(
    data: OrionMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    cognitive_context = _get_cognitive_context(current_user.id, db)
    user_memory = _get_orion_user_memory(current_user.id, db)
    orion_settings = _get_orion_settings(current_user.id, db)
    settings_prompt = _build_orion_settings_prompt(orion_settings)
    right_panel_prompt = _build_right_panel_prompt(data.right_panel_context)

    system_prompt = ORION_SYSTEM_PROMPT + settings_prompt + right_panel_prompt + cognitive_context + user_memory

    messages = [{"role": "system", "content": system_prompt}]
    for msg in data.history[-12:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": data.content})

    # Conversation management
    conversation_id = _get_or_create_conversation(data.conversation_id, current_user.id, data.content, db)
    _save_orion_message(conversation_id, current_user.id, "user", data.content, db)

    async def generate():
        accumulated = ""
        try:
            stream = _groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                max_tokens=900,
                temperature=0.68,
                stream=True,
            )
            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    accumulated += token
                    yield f"data: {json.dumps({'text': token})}\n\n"
        except Exception as e:
            print(f"[Orion stream error] {type(e).__name__}: {e}")
            error_msg = "Something went wrong. Please try again."
            accumulated = accumulated or error_msg
            if not accumulated:
                yield f"data: {json.dumps({'text': error_msg})}\n\n"

        # Save assistant response after streaming
        if accumulated:
            _save_orion_message(conversation_id, current_user.id, "assistant", accumulated, db)

        yield f"data: {json.dumps({'conversation_id': conversation_id})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/message")
async def orion_message(
    data: OrionMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    cognitive_context = _get_cognitive_context(current_user.id, db)
    user_memory = _get_orion_user_memory(current_user.id, db)
    orion_settings = _get_orion_settings(current_user.id, db)
    settings_prompt = _build_orion_settings_prompt(orion_settings)
    right_panel_prompt = _build_right_panel_prompt(data.right_panel_context)

    system_prompt = ORION_SYSTEM_PROMPT + settings_prompt + right_panel_prompt + cognitive_context + user_memory

    messages = [{"role": "system", "content": system_prompt}]
    for msg in data.history[-12:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": data.content})

    # Conversation management
    conversation_id = _get_or_create_conversation(data.conversation_id, current_user.id, data.content, db)
    _save_orion_message(conversation_id, current_user.id, "user", data.content, db)

    try:
        response = _call_groq(messages)
        reply = response.choices[0].message.content
        _save_orion_message(conversation_id, current_user.id, "assistant", reply, db)
        return {"response": reply, "conversation_id": conversation_id}
    except Exception as e:
        print(f"[Orion error] {type(e).__name__}: {e}")
        return {"response": "Having trouble connecting. Please try again.", "conversation_id": conversation_id}


@router.post("/live-event")
async def orion_live_event(
    data: LiveEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    game_name = GAME_NAMES.get(data.game_type, data.game_type)
    event = data.event_type
    d = data.data

    system = f"""You are Orion, a warm brain training companion. You are watching a live game session. Generate ONE short notification message (1-2 sentences, no more) for the event below.

Be specific, personal, and varied in tone. Sometimes celebrate, sometimes give a quick tip, sometimes note an interesting pattern. Never be generic. Never start with "Great job!" Use simple friendly language. No jargon.

Game: {game_name}
Event: {event}
Data: {json.dumps(d)}"""

    prompt_map = {
        "correct": f"The user just got a correct answer. Level: {d.get('level', '?')}, streak: {d.get('streak', 0)}.",
        "wrong": f"The user just got a wrong answer. Level: {d.get('level', '?')}. They answered: {d.get('given', '?')}, correct was: {d.get('expected', '?')}.",
        "level_up": f"The user just advanced to level {d.get('level', '?')}!",
        "streak": f"The user has a streak of {d.get('streak', 0)} correct in a row.",
        "time_taken": f"The user took {d.get('time_ms', 0)}ms to answer. Average so far: {d.get('avg_ms', 0)}ms.",
        "session_start": "The user just started a new game session.",
        "consecutive_fails": f"The user has had {d.get('count', 0)} consecutive wrong answers.",
    }

    user_msg = prompt_map.get(event, f"Event: {event}. Data: {json.dumps(d)}")
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_msg},
    ]

    try:
        response = _call_groq(messages, max_tokens=120, temperature=0.8)
        return {"notification": response.choices[0].message.content.strip()}
    except Exception as e:
        print(f"[Orion live event error] {type(e).__name__}: {e}")
        return {"notification": None}


@router.post("/debrief")
async def orion_debrief(
    data: DebriefRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    game_name = GAME_NAMES.get(data.game_type, data.game_type)
    cognitive_context = _get_cognitive_context(current_user.id, db)

    rounds_summary = []
    for i, r in enumerate(data.rounds[:20]):
        correct = r.get("correct", False)
        level = r.get("level", "?")
        mode = r.get("mode", "")
        time_ms = r.get("time_ms")
        entry = f"Round {i+1} (Level {level}): {'correct' if correct else 'wrong'}"
        if mode:
            entry += f" | mode: {mode}"
        if time_ms:
            entry += f" | {time_ms}ms"
        rounds_summary.append(entry)

    correct_count = sum(1 for r in data.rounds if r.get("correct"))
    total = len(data.rounds)
    accuracy = round(correct_count / total * 100) if total else 0
    max_level = max((r.get("level", 0) for r in data.rounds), default=0)

    duration_note = ""
    if data.session_duration_ms:
        mins = data.session_duration_ms // 60000
        secs = (data.session_duration_ms % 60000) // 1000
        duration_note = f"Session duration: {mins}m {secs}s."

    system = f"""You are Orion, a warm and sharp brain training companion. Write a personalised post-game debrief for this session. Use simple friendly language. No psychological jargon. No em dashes.

Structure your response in this exact format (use these exact section labels):

HEADLINE: [one sentence that captures the session in a specific, memorable way]

WHAT HAPPENED: [2-3 sentences describing the actual pattern of this session, referencing specific numbers and moments]

WHAT THIS TELLS YOU: [2-3 sentences explaining in simple terms what their performance reveals about how their brain handled this task today, use a "fun fact" format for any interesting insight]

ONE THING TO TRY: [1-2 sentences giving a specific, actionable strategy for next time, connected to what you actually observed]

Keep the whole thing under 200 words. Be specific, warm, and personal. Vary your language so each debrief feels fresh.

Game: {game_name}
Accuracy: {accuracy}% ({correct_count}/{total} correct)
Max level reached: {max_level}
{duration_note}
Stats: {json.dumps(data.stats)}
Round by round:
{chr(10).join(rounds_summary)}
{cognitive_context[:800] if cognitive_context else ''}"""

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": "Generate the debrief for this session."},
    ]

    try:
        response = _call_groq(messages, max_tokens=400, temperature=0.7)
        debrief_text = response.choices[0].message.content.strip()

        insight = InsightSummary(
            user_id=current_user.id,
            title=f"{game_name} - {datetime.utcnow().strftime('%b %d, %Y')} - Level {max_level} - {accuracy}% accuracy",
            content=debrief_text,
            source="orion_debrief",
        )
        db.add(insight)
        db.commit()
        db.refresh(insight)

        return {
            "debrief": debrief_text,
            "insight_id": insight.id,
            "stats": {
                "accuracy": accuracy,
                "correct": correct_count,
                "total": total,
                "max_level": max_level,
            }
        }
    except Exception as e:
        print(f"[Orion debrief error] {type(e).__name__}: {e}")
        return {"debrief": "Your results have been saved.", "insight_id": None, "stats": {}}


@router.get("/debriefs")
async def get_debriefs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    summaries = (
        db.query(InsightSummary)
        .filter(
            InsightSummary.user_id == current_user.id,
            InsightSummary.source == "orion_debrief",
        )
        .order_by(desc(InsightSummary.created_at))
        .limit(20)
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "content": s.content,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in summaries
    ]


@router.get("/memory-view")
def orion_memory_view(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cognitive_context = _get_cognitive_context(current_user.id, db)
    user_memory = _get_orion_user_memory(current_user.id, db)
    orion_settings = _get_orion_settings(current_user.id, db)
    settings_prompt = _build_orion_settings_prompt(orion_settings)

    summaries = (
        db.query(InsightSummary)
        .filter(
            InsightSummary.user_id == current_user.id,
            InsightSummary.source.in_(["orion_memory", "orion_debrief"]),
        )
        .order_by(desc(InsightSummary.created_at))
        .limit(10)
        .all()
    )
    insights = [
        {
            "title": s.title,
            "content": s.content[:300],
            "source": s.source,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in summaries
    ]

    return {
        "settings_prompt": settings_prompt.strip() if settings_prompt else "",
        "cognitive_context": cognitive_context.strip() if cognitive_context else "",
        "user_memory": user_memory.strip() if user_memory else "",
        "insights": insights,
        "tone": orion_settings.get("orion_tone", "coach"),
        "focus_games": orion_settings.get("orion_focus_games", []),
    }


@router.post("/save-note")
async def save_orion_note(
    data: SaveOrionNoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    insight = InsightSummary(
        user_id=current_user.id,
        title=data.title,
        content=data.content,
        source=data.source,
    )
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return {"id": insight.id, "saved": True}


@router.get("/right-panel-content")
async def get_right_panel_content(
    content_type: str = "scenario",
    game_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cognitive_context = _get_cognitive_context(current_user.id, db)
    game_name = GAME_NAMES.get(game_type or "", "brain training") if game_type else "brain training"

    prompts = {
        "scenario": f"""Generate a short "what would you do?" thinking scenario for someone practising {game_name}. 
Make it relatable, fun, and connected to pattern recognition, memory, or reasoning. 
Format: SCENARIO: [2-3 sentence situation] OPTIONS: A) [option] B) [option] C) [option] THINK_ABOUT: [1 sentence hint without giving away the answer]
Keep it simple and engaging. No jargon. Put each option on its own line.""",

        "exercise": f"""Generate a quick 2-minute brain exercise someone can try right now, relevant to {game_name} skills.
Format: TITLE: [exercise name] INSTRUCTIONS: [3-4 clear steps] WHY_IT_HELPS: [1 sentence simple explanation]
Make it doable without any props, just their mind.""",

        "fun_fact": f"""Generate a genuinely interesting brain or memory fun fact connected to {game_name or 'thinking and memory'}.
Format: HOOK: [1 surprising sentence to grab attention] DETAIL: [2-3 sentences expanding on it in simple language] CONNECTION: [1 sentence connecting it to what they are practising]
Make it feel like something they would want to share with someone.""",

        "curiosity_prompt": f"""Generate a thought-provoking question about memory, thinking, or reasoning that most people have never considered.
Format: QUESTION: [the question] EXPLORE: [2-3 sentences exploring why it is interesting] YOUR_TAKE: [1 sentence inviting the user to think about their own experience]
Keep it accessible and genuinely curious-making.""",

        "daily_challenge": f"""Generate a daily mental challenge connected to {game_name} skills.
Format: CHALLENGE: [the challenge title] TASK: [2-3 sentences describing what to do today] LEVEL: [Beginner/Intermediate/Advanced] BONUS: [1 optional harder version]
Make it something achievable in a few minutes throughout the day.""",
    }

    system = ORION_SYSTEM_PROMPT[:500] + "\n\nGenerate content in the exact format requested. Simple language only."
    user_msg = prompts.get(content_type, prompts["fun_fact"])
    if cognitive_context:
        user_msg += f"\n\nUser context: {cognitive_context[:400]}"

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_msg},
    ]

    try:
        response = _call_groq(messages, max_tokens=400, temperature=0.85)
        raw = response.choices[0].message.content.strip()

        result: dict = {"type": content_type, "raw": raw, "game_type": game_type}

        if content_type == "scenario":
            scenario_idx = raw.find("SCENARIO:")
            options_idx = raw.find("OPTIONS:")
            think_idx = raw.find("THINK_ABOUT:")

            if scenario_idx >= 0 and options_idx >= 0:
                result["scenario"] = raw[scenario_idx + 9:options_idx].strip()
                options_end = think_idx if think_idx >= 0 else len(raw)
                options_text = raw[options_idx + 8:options_end].strip()

                # Parse each option - handle multiline format (each option on its own line)
                import re
                lines = [line.strip() for line in options_text.split('\n') if line.strip()]
                option_lines = [l for l in lines if re.match(r'^[A-Da-d][\.\)]', l)]

                if len(option_lines) >= 2:
                    result["options"] = option_lines
                else:
                    # Fallback: try splitting on A) B) C) D) inline
                    inline_matches = re.findall(r'[A-D][\.\)]\s*([^A-D\.\)]+?)(?=[A-D][\.\)]|$)', options_text)
                    if inline_matches and len(inline_matches) >= 2:
                        result["options"] = [f"{chr(65+i)}) {m.strip()}" for i, m in enumerate(inline_matches)]
                    else:
                        result["options"] = lines[:4] if lines else []

                if think_idx >= 0:
                    result["think_about"] = raw[think_idx + 12:].strip()

        elif content_type == "exercise":
            for key, label in [("title", "TITLE:"), ("instructions", "INSTRUCTIONS:"), ("why", "WHY_IT_HELPS:")]:
                idx = raw.find(label)
                if idx >= 0:
                    other_labels = [l for l in ["TITLE:", "INSTRUCTIONS:", "WHY_IT_HELPS:"] if l != label]
                    next_positions = [raw.find(l, idx + len(label)) for l in other_labels if raw.find(l, idx + len(label)) > 0]
                    end = min(next_positions) if next_positions else len(raw)
                    result[key] = raw[idx + len(label):end].strip()

        elif content_type == "fun_fact":
            for key, label in [("hook", "HOOK:"), ("detail", "DETAIL:"), ("connection", "CONNECTION:")]:
                idx = raw.find(label)
                if idx >= 0:
                    other_labels = [l for l in ["HOOK:", "DETAIL:", "CONNECTION:"] if l != label]
                    next_positions = [raw.find(l, idx + len(label)) for l in other_labels if raw.find(l, idx + len(label)) > 0]
                    end = min(next_positions) if next_positions else len(raw)
                    result[key] = raw[idx + len(label):end].strip()

        elif content_type == "curiosity_prompt":
            for key, label in [("question", "QUESTION:"), ("explore", "EXPLORE:"), ("your_take", "YOUR_TAKE:")]:
                idx = raw.find(label)
                if idx >= 0:
                    other_labels = [l for l in ["QUESTION:", "EXPLORE:", "YOUR_TAKE:"] if l != label]
                    next_positions = [raw.find(l, idx + len(label)) for l in other_labels if raw.find(l, idx + len(label)) > 0]
                    end = min(next_positions) if next_positions else len(raw)
                    result[key] = raw[idx + len(label):end].strip()

        elif content_type == "daily_challenge":
            for key, label in [("challenge", "CHALLENGE:"), ("task", "TASK:"), ("level", "LEVEL:"), ("bonus", "BONUS:")]:
                idx = raw.find(label)
                if idx >= 0:
                    other_labels = [l for l in ["CHALLENGE:", "TASK:", "LEVEL:", "BONUS:"] if l != label]
                    next_positions = [raw.find(l, idx + len(label)) for l in other_labels if raw.find(l, idx + len(label)) > 0]
                    end = min(next_positions) if next_positions else len(raw)
                    result[key] = raw[idx + len(label):end].strip()

        return result
    except Exception as e:
        print(f"[Orion right panel error] {type(e).__name__}: {e}")
        return {"type": content_type, "raw": "Could not generate content right now.", "game_type": game_type}


# ── Conversation History Routes ───────────────────────────────────────────────

@router.get("/conversations")
async def orion_list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all Orion conversations for this user."""
    conversations = (
        db.query(OrionConversation)
        .filter(OrionConversation.user_id == current_user.id)
        .order_by(desc(OrionConversation.updated_at))
        .limit(30)
        .all()
    )
    return [
        {
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }
        for c in conversations
    ]


@router.get("/conversations/{conversation_id}")
async def orion_get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific Orion conversation with its messages."""
    conversation = (
        db.query(OrionConversation)
        .filter(
            OrionConversation.id == conversation_id,
            OrionConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = (
        db.query(OrionMessage)
        .filter(
            OrionMessage.conversation_id == conversation_id,
            OrionMessage.user_id == current_user.id,
        )
        .order_by(OrionMessage.created_at)
        .all()
    )

    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
        "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else None,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


@router.delete("/conversations/{conversation_id}")
async def orion_delete_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an Orion conversation."""
    conversation = (
        db.query(OrionConversation)
        .filter(
            OrionConversation.id == conversation_id,
            OrionConversation.user_id == current_user.id,
        )
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.query(OrionMessage).filter(OrionMessage.conversation_id == conversation_id).delete()
    db.delete(conversation)
    db.commit()
    return {"ok": True}