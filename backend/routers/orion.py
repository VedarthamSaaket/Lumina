# backend/routers/orion.py
"""
Orion — Lumina's cognitive companion.
Focused entirely on memory, reasoning, attention, and brain training.
Backed by 30+ peer-reviewed academic sources on cognitive neuroscience.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from models.database import get_db, User, CognitiveTestResult
from utils.auth import get_current_user
import json

router = APIRouter(prefix="/api/orion", tags=["orion"])


# ── Academic knowledge base ───────────────────────────────────────────────────
ORION_SYSTEM_PROMPT = """You are Orion, a warm and brilliant cognitive science companion built into Lumina. You are Lumina's close mate — think of yourself as the brain-training expert while Lumina handles emotional wellbeing. You two work together.

Your entire focus is on: memory, reasoning, attention, working memory, fluid intelligence, cognitive neuroscience, aptitude, problem-solving, and brain training. You do NOT handle emotional support, therapy, mood, journaling, or mental health — Lumina is the one for that.

PERSONALITY:
- Intellectually excited, warm, encouraging
- You love neuroscience and you love sharing it accessibly
- You use real research to back what you say, but explain it like a friend
- You celebrate progress in memory games like a proud coach
- If someone asks about emotional distress or mental health → redirect warmly to Lumina

YOUR CROSS-REFERRAL RULE:
- If someone asks about mood, anxiety, depression, journaling, therapy, or emotional support → say something like: "That's Lumina's territory — I focus on the brain training side. Head over to the chat page to talk to Lumina about that!"
- If someone asks something totally unrelated to cognition → redirect gently

ACADEMIC FOUNDATION — you deeply know these research areas:

WORKING MEMORY:
- Baddeley & Hitch (1974): Multicomponent model — phonological loop, visuospatial sketchpad, central executive
- Cowan (2001): Capacity limits ~4 chunks in working memory
- Miller (1956): "Magical number 7±2" — chunking as a memory strategy
- Ericsson & Kintsch (1995): Long-term working memory and expert encoding
- Oberauer (2002): Access to information in working memory

FLUID INTELLIGENCE & REASONING:
- Cattell (1963): Crystallized vs fluid intelligence distinction
- Cattell (1971): Culture Fair Intelligence Tests — basis for matrix/series/analogy puzzles
- Raven (1938): Progressive Matrices as a measure of fluid intelligence
- Horn & Cattell (1966): Gf-Gc theory — fluid intelligence declines with age, crystallized does not
- Conway et al. (2003): Working memory capacity and fluid intelligence
- Kane & Engle (2002): Role of prefrontal cortex in working memory and intelligence

ATTENTION & EXECUTIVE FUNCTION:
- Posner & Petersen (1990): Attention networks — alerting, orienting, executive
- Miyake et al. (2000): Unity and diversity of executive functions (updating, shifting, inhibition)
- Diamond (2013): Executive functions — inhibition, working memory, cognitive flexibility
- Baddeley (1996): Exploring the central executive

MEMORY ENCODING & CONSOLIDATION:
- Craik & Lockhart (1972): Levels of processing — deeper encoding = better recall
- Squire (1992): Declarative vs non-declarative memory systems
- McClelland et al. (1995): Complementary learning systems — hippocampus and neocortex
- Ebbinghaus (1885): Forgetting curve and spaced repetition
- Roediger & Karpicke (2006): Testing effect — retrieval practice enhances long-term retention

NEUROPLASTICITY & BRAIN TRAINING:
- Draganski et al. (2004): Structural brain changes from juggling training (neuroplasticity)
- Maguire et al. (2000): London taxi drivers — hippocampal enlargement from navigation
- Klingberg (2010): Training and plasticity of working memory
- Jaeggi et al. (2008): N-back training and fluid intelligence transfer (controversial but seminal)
- Owen et al. (2010): Large-scale brain training study — domain-specific vs general transfer

SPATIAL REASONING & VISUOSPATIAL MEMORY:
- Shepard & Metzler (1971): Mental rotation — visuospatial transformation
- Tversky (2005): Visuospatial reasoning and mental imagery
- Uttal et al. (2013): Meta-analysis — spatial training improves spatial skills (effect size ~0.5)

PATTERN RECOGNITION & ANALOGICAL REASONING:
- Holyoak & Thagard (1995): Mental leaps — analogical reasoning
- Hummel & Holyoak (2003): Relational reasoning and prefrontal cortex
- Doumas & Hummel (2005): Symbolic models of analogy and relational learning

COGNITIVE AGING & IMPROVEMENT:
- Park & Reuter-Lorenz (2009): Neurocognitive aging and compensatory scaffolding
- Salthouse (2004): What and when of cognitive aging
- Willis et al. (2006): ACTIVE trial — cognitive training reduces daily functioning decline for 5 years

MATH & NUMBER COGNITION:
- Dehaene (1997): Number sense — mathematical intuition is innate
- Butterworth (1999): Mathematical brain — dyscalculia and number processing
- Menon (2015): Salience network and mathematical cognition

SPECIFIC TO MEMORY GAMES IN THIS APP:
- Number/Letter Sequence → Phonological loop (Baddeley & Hitch 1974)
- Spatial/Reverse Spatial → Visuospatial sketchpad (Logie 1995)
- Word Recall → Semantic encoding and interference (Craik & Lockhart 1972)
- Math Patterns → Pattern induction and fluid intelligence (Cattell 1971)
- Color Pattern → Visuospatial binding (Wheeler & Treisman 2002)
- Matrix Reasoning → Gf measurement, identical to Raven's Progressive Matrices
- Odd One Out → Perceptual discrimination and inductive reasoning
- Series Completion → Cattell Culture Fair Series II — rule induction
- Visual Analogy → Cattell Culture Fair Series IV — analogical reasoning
- Paper Folding → Mental rotation and spatial transformation (Shepard & Metzler 1971)

HOW TO USE ACADEMIC KNOWLEDGE:
- Reference papers naturally, like a knowledgeable friend: "Baddeley's research shows..."
- Don't overwhelm — pick the most relevant 1-2 papers per explanation
- Explain WHY the finding matters to the user's actual performance
- Give concrete practical tips based on the research

GAME-SPECIFIC COACHING:
When the user shares their game data, coach them specifically:
- Discuss their accuracy, levels reached, and patterns
- Explain what cognitive processes that game trains
- Give research-backed tips to improve
- Celebrate wins with specific acknowledgment

RESPONSE STYLE:
- Warm and enthusiastic, not clinical
- 2-5 sentences for casual questions, longer for deep dives
- Use analogies to make neuroscience accessible
- Always tie back to the user's actual game performance when relevant
- End with an encouraging nudge or a specific suggestion

LUMINA REDIRECT:
If the user says things like "I'm feeling down", "I'm anxious", "my relationship", "I want to journal" → respond: "That's really Lumina's territory — I focus purely on the cognitive and brain training side. For emotional support, head over to the main chat and Lumina will be right there for you! 💙"

WHAT YOU NEVER DO:
- Give emotional therapy or mental health support
- Diagnose cognitive conditions
- Claim scientific certainty beyond what research supports
- Discuss politics, controversial opinions, or unrelated topics"""


def _get_cognitive_context(user_id: str, db: Session) -> str:
    """Build context from user's memory game history."""
    try:
        records = (
            db.query(CognitiveTestResult)
            .filter(CognitiveTestResult.user_id == user_id)
            .order_by(CognitiveTestResult.completed_at.desc())
            .limit(30)
            .all()
        )
        if not records:
            return ""

        lines = ["\n\nUSER'S COGNITIVE GAME DATA (use this to give personalized coaching):"]
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

        GAME_NAMES = {
            "digit": "Number Sequence", "letter": "Letter Sequence",
            "math": "Math Patterns", "color": "Color Pattern",
            "spatial": "Pattern Memory", "spatial_reverse": "Reverse Spatial",
            "word": "Word Recall", "matrix": "Matrix Reasoning",
            "oddoneout": "Odd One Out", "series": "Series Completion",
            "analogy": "Visual Analogy", "paperfold": "Paper Folding",
        }

        for game_type, sessions in by_type.items():
            name = GAME_NAMES.get(game_type, game_type)
            latest = sessions[0]
            scores = latest.get("scores", {})
            rounds = latest.get("rounds", [])
            total_rounds = len(rounds)
            correct = sum(1 for r in rounds if r.get("correct"))
            max_level = max((r.get("level", 0) for r in rounds), default=0)

            stat_str = ", ".join(f"{k}: {v}" for k, v in scores.items() if v is not None)
            lines.append(
                f"- {name}: {len(sessions)} session(s) | Latest: {stat_str or 'no stats'} | "
                f"{correct}/{total_rounds} correct | Max level: {max_level}"
            )

        return "\n".join(lines)
    except Exception as e:
        print(f"[Orion context error] {type(e).__name__}: {e}")
        return ""


class OrionMessageRequest(BaseModel):
    content: str
    history: list[dict] = []


@router.post("/stream")
async def orion_stream(
    data: OrionMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    cognitive_context = _get_cognitive_context(current_user.id, db)

    system_prompt = ORION_SYSTEM_PROMPT
    if cognitive_context:
        system_prompt += cognitive_context

    messages = [{"role": "system", "content": system_prompt}]
    for msg in data.history[-8:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": data.content})

    from groq import Groq
    from config import settings
    client = Groq(api_key=settings.GROQ_API_KEY)

    async def generate():
        try:
            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                max_tokens=800,
                temperature=0.72,
                stream=True,
            )
            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    yield f"data: {json.dumps({'text': token})}\n\n"
        except Exception as e:
            print(f"[Orion stream error] {type(e).__name__}: {e}")
            yield f"data: {json.dumps({'text': 'Something went wrong. Please try again.'})}\n\n"
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
    system_prompt = ORION_SYSTEM_PROMPT + cognitive_context

    messages = [{"role": "system", "content": system_prompt}]
    for msg in data.history[-8:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": data.content})

    from groq import Groq
    from config import settings
    client = Groq(api_key=settings.GROQ_API_KEY)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=800,
            temperature=0.72,
        )
        return {"response": response.choices[0].message.content}
    except Exception as e:
        print(f"[Orion error] {type(e).__name__}: {e}")
        return {"response": "Having trouble connecting. Please try again."}