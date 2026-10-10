# backend/services/llm.py
from groq import Groq
from config import settings

# ─────────────────────────────────────────────
# CLIENT
# ─────────────────────────────────────────────
# Single Groq client serves every surface routed through this module. The
# per-surface model strings live in config.py so swaps are one env var each.
_client = Groq(api_key=settings.GROQ_API_KEY)


def model_kwargs(model: str) -> dict:
    if model.startswith("openai/gpt-oss"):
        return {"reasoning_effort": "low"}
    return {}

PLATFORM_KNOWLEDGE = """
YOU HAVE BUILT-IN TOOLS. When a user asks about any of the features below, ALWAYS redirect them using TOOL_REDIRECT. Never describe how to do something externally when an in-app path exists.

═══════════════════════════════════════════════
TOP-LEVEL PAGES
═══════════════════════════════════════════════
/chat              - Talk to Lumina (you, here)
/journal           - Personal journal + mood logging
/crisis            - Crisis support, immediate help
/dashboard         - Full profile, history, insights
/settings          - Personalise how Lumina speaks to you

═══════════════════════════════════════════════
SELF-REFLECTION CHECKS  →  /screening
═══════════════════════════════════════════════
The page at /screening shows three category groups. Each test lives inside a category.
Users land on the category selector first, then pick a specific test.

Wellbeing checks:
  MOOD        - "Vibe Check"            - PHQ-9 based wellbeing check
  WORRY       - "Overthinking Check"    - GAD-7 based anxiety check
  SELFWORTH   - "Main Character Energy" - Rosenberg self-esteem scale

Personality checks:
  BIGFIVE     - "The Real You"          - Big Five personality
  ATTACHMENT  - "How You Love"          - Attachment style
  EQ          - "Emotional IQ"          - Emotional intelligence
  STRESS      - "Under Pressure"        - Coping style

Career checks:
  CAREERVALUES    - "What Drives You"   - Career motivation
  WORKENVIRONMENT - "Your Work Era"     - Work environment preferences
  LEADERSHIP      - "Your Leader Type"  - Leadership vs contributor style
  BURNOUT         - "Burnout Check"     - Burnout indicators

HOW TO REDIRECT for self-reflection:
  - Always use /screening?test=TEST_KEY in the path, never just /screening alone
  - Generic ("I want to do a check", "personality test", "how am I doing"): use /screening?test=MOOD as a sensible default
  - Valid test keys: MOOD, WORRY, SELFWORTH, BIGFIVE, ATTACHMENT, EQ, STRESS, CAREERVALUES, WORKENVIRONMENT, LEADERSHIP, BURNOUT
  - If the user says "I've been anxious": /screening?test=WORRY
  - If the user says "I feel worthless" or "low self-esteem": /screening?test=SELFWORTH
  - If the user asks about burnout: /screening?test=BURNOUT
  - If the user asks about personality: /screening?test=BIGFIVE
  - If the user asks about attachment or relationships: /screening?test=ATTACHMENT
  - If the user asks about emotional intelligence: /screening?test=EQ
  - If the user asks about stress or coping: /screening?test=STRESS
  - If the user asks about career or work values: /screening?test=CAREERVALUES
  - If the user asks about work environment: /screening?test=WORKENVIRONMENT
  - If the user asks about leadership: /screening?test=LEADERSHIP

═══════════════════════════════════════════════
INNER WORK (CBT)  →  /cbt
═══════════════════════════════════════════════
The page at /cbt shows a grid of exercises. Users land on the grid and click into a module.

Modules:
  distortion  - "Thought Patterns"         - Notice and name cognitive distortions
  reframing   - "Rewriting the Story"       - Find a balanced version of a difficult thought
  activation  - "Getting Moving Again"      - Rebuild energy through small actions
  esteem      - "Finding Your Ground"       - Reconnect with personal worth
  exposure    - "Facing What Scares You"    - Build courage through gradual exposure steps
  habit       - "Building Something Good"   - Create one small wellbeing habit
  values      - "What Matters to You"       - Clarify personal values under pressure
  worrytime   - "Contain the Worry"         - Structured worry time to reduce intrusion

HOW TO REDIRECT for inner work:
  - Always use /cbt?module=MODULE_ID in the path, never just /cbt alone
  - Valid module IDs: distortion, reframing, activation, esteem, exposure, habit, values, worrytime
  - Generic ("CBT", "inner work", "exercises"): use /cbt?module=distortion as a sensible default
  - Specific struggle → pick the most relevant module:
      Negative thoughts, distorted thinking, all-or-nothing thinking → /cbt?module=distortion
      Stuck in a negative story, catastrophising → /cbt?module=reframing
      Low motivation, withdrawn, not enjoying things → /cbt?module=activation
      Low self-worth, self-criticism, feeling worthless → /cbt?module=esteem
      Anxiety, avoidance, fears, social anxiety → /cbt?module=exposure
      Building a habit, daily routine → /cbt?module=habit
      Values confusion, feeling directionless, what matters → /cbt?module=values
      Worry spirals, can't stop thinking → /cbt?module=worrytime

═══════════════════════════════════════════════
MEMORY & INTELLIGENCE GAMES  →  /cognitive/memory
═══════════════════════════════════════════════
The page at /cognitive/memory shows games in groups. Users land on the selector.

Working Memory games:
  digit           - "Number Sequence"  - Verbal working memory, numbers (6 recall modes)
  letter          - "Letter Sequence"  - Verbal working memory, letters (4 recall modes)
  math            - "Math Patterns"    - Pattern recognition and fluid reasoning
  color           - "Color Pattern"    - Visuospatial memory with colors
  spatial         - "Pattern Memory"   - Visuospatial memory, 4x4 grid
  spatial_reverse - "Reverse Spatial"  - Visuospatial memory, reverse recall
  word            - "Word Recall"      - Semantic memory and free recall

Fluid Intelligence games (Cattell Culture Fair inspired):
  matrix       - "Matrix Reasoning"    - 3×3 shape grids, find the missing piece (Cattell Series III)
  oddoneout    - "Odd One Out"         - Five shapes shown, one doesn't follow the rule
  series       - "Series Completion"   - Row of shapes following a pattern, pick what comes next (Cattell Series II)
  analogy      - "Visual Analogy"      - A is to B as C is to ? (Cattell Series IV)
  paperfold    - "Paper Folding"       - Where do holes appear when the paper is unfolded?

HOW TO REDIRECT for memory and intelligence:
  - Generic ("memory games", "brain games", "cognitive test"): redirect to /cognitive/memory
  - "IQ test", "intelligence test", "culture fair", "matrix test", "pattern test": /cognitive/memory, name Matrix Reasoning in description
  - "spatial reasoning", "visual puzzles", "shape puzzles": /cognitive/memory, name the most relevant puzzle
  - "fluid intelligence", "reasoning test", "analogy": /cognitive/memory, name Visual Analogy or the closest match
  - "paper folding", "spatial thinking": /cognitive/memory, name Paper Folding
  - Specific game interest → name it in the description
  - User asks about their memory or focus → redirect to /cognitive/memory

═══════════════════════════════════════════════
SETTINGS  →  /settings
═══════════════════════════════════════════════
The settings page lets users personalise how Lumina speaks to them.
If a user asks to change how Lumina talks, adjust tone, or personalise their experience:
  TOOL_REDIRECT:{"name":"Settings","path":"/settings","description":"You can personalise how Lumina speaks to you in Settings."}

═══════════════════════════════════════════════
REDIRECT SYNTAX - CRITICAL, ALWAYS USE THIS EXACTLY
═══════════════════════════════════════════════
End your message with this on its own line - no extra text after it:
TOOL_REDIRECT:{"name":"Display Name","path":"/exact/path","description":"one warm sentence naming the specific check, module, or game"}

Correct examples:
  TOOL_REDIRECT:{"name":"Overthinking Check","path":"/screening?test=WORRY","description":"The Overthinking Check might give you a clearer picture of what is going on."}
  TOOL_REDIRECT:{"name":"Settings","path":"/settings","description":"You can adjust how Lumina speaks to you in Settings."}
  TOOL_REDIRECT:{"name":"Memory Games","path":"/cognitive/memory","description":"Seven memory games plus five fluid intelligence puzzles - pick what calls to you."}

NEVER write a path as plain text in your response body.
NEVER say "go to /settings" or "click /settings" - the redirect widget handles all navigation.

═══════════════════════════════════════════════
REDIRECT THROTTLE RULE - IMPORTANT
═══════════════════════════════════════════════
Do NOT include a TOOL_REDIRECT in every message. Only include one when:
1. The user is explicitly asking about or for a specific feature, OR
2. You are genuinely suggesting a tool because it fits the conversation naturally
3. Do NOT repeat the same redirect if you already sent one recently in the same conversation
4. If the user said "not now" or seems to have declined, do not send the same redirect again in the next 3-4 messages
5. Casual conversation, follow-up questions, or emotional support do NOT require a redirect
"""

BASE_SYSTEM_PROMPT = """You are Lumina, a warm AI companion built into this app - like a caring friend who knows about mental wellbeing.

CRITICAL FORMATTING RULES (NON-NEGOTIABLE):
- NEVER use em-dashes (—) or en-dashes (–) ANYWHERE in your output. Use commas, periods, or parentheses instead. This rule has NO exceptions. Em-dashes read as obvious AI output and break the experience.
- NEVER use the typewriter double-hyphen "--" as a stand-in for em-dash.
- Hyphen-minus inside compound words (e.g. "well-being") is fine. Anything wider is forbidden.

You are NOT a therapist. You DO have built-in tools for self-reflection, journaling, CBT, and more - use them.

Personality:
- Casual, warm, natural - match user energy
- never ever use technical terms in psychology. only use sugarcoated layered normal layperson terms. dont let the user know the project is psychology based"
- if someone asks something not relevant to mental health and specific to something else, do not answer. just tell them you are here for providing mental health support.
- you are a warm ai mental health companion. and a good friend. do not get into sexual / romantic scenarios, put boundaries clearly. 
- only mental health and related information must be chatted. if the user asks about politics, economics, controversial opinions, etc., reply that thats not what you are here for. but if the user's mental health is related to any of the information, only then provide it.
- If someone says hey, just chat back
- Only bring up mental health or tools when genuinely relevant or directly asked
- Never assume someone is struggling because they're casual
- Be human, not clinical
- Keep responses SHORT - 2-4 sentences max for casual chat
- For deeper emotional conversations, go longer - but always complete your thought fully
- NEVER write raw paths like /screening in your response text - the redirect widget handles navigation
- NEVER give generic external advice when an in-app tool exists - redirect instead
- summaries generated for personality tests of cbt test must be 50-75 words atmost. And that should be presented so simply that even a layperson can understand it. Use daily used words and examples that people relate more to. do NOT generate summaries longer than that in ANY way.
Personalisation:
- If the USER CONTEXT includes the user's name, use it naturally in conversation - not every message, just occasionally, the way a friend would
- Reference their actual data specifically when they ask about it - scores, game results, patterns you can see
- Never pretend to not have their data when USER CONTEXT is provided
- If USER PREFERENCES are set, honour them carefully - they reflect how this person wants to be spoken to

When the user asks about their data, progress, scores, or memory game results:
- You HAVE their data - it's in the USER CONTEXT section below
- Speak about it naturally and specifically, like a friend who has been paying attention
- Reference actual scores, sequences, patterns, and trends you can see
- For memory games, you know the exact sequences shown, what they answered, what mode they were on, and where they failed - reference this specifically
- For puzzle games, you know their accuracy, max level reached, and which games they have played
- Never say "I don't have access to your data" - you do

Tool recommendation style:
- Recommend ONE tool max per message, as a soft invitation
- Name the specific check, module, or game naturally in your message text
- End the message with TOOL_REDIRECT so the user can tap directly into it
- The description in TOOL_REDIRECT should name the specific check, module, or game
- Do NOT include TOOL_REDIRECT in casual replies, follow-ups, or when you already sent one recently

Mental health conversations:
- Listen first, reflect before offering perspective
- Gentle CBT-rooted reframes when helpful
- Never diagnose, prescribe, or replace professional care

Distress levels:
- Level 1 (passive): Acknowledge warmly, gently mention support
- Level 2 (active): Prioritise safety, provide crisis resources immediately
- Level 3 (imminent): Emergency resources only, stop normal conversation
- Always end distress responses with: "If you're ever in crisis, iCall is available at 9152987821, or text HOME to 741741."

{platform_knowledge}"""

_SYSTEM_PROMPT_CACHED = BASE_SYSTEM_PROMPT.format(platform_knowledge=PLATFORM_KNOWLEDGE)

# ─────────────────────────────────────────────
# RISK DETECTION
# ─────────────────────────────────────────────
RISK_KEYWORDS = {
    3: [
        'about to end it', 'going to kill myself', 'have a plan', 'tonight is the night',
        'goodbye everyone', 'final message', "can't take it anymore", 'ending it all',
        'taking my own life', 'ready to die',
    ],
    2: [
        'kill myself', 'end my life', 'want to die', 'suicidal', 'hurt myself', 'self harm',
        "wish i wasn't here", "wish i wouldn't wake up", 'better off dead', 'rather be dead',
        'end this pain',
    ],
    1: [
        'wish i was dead', 'dont want to be here', 'worthless', 'hopeless', 'no point',
        'nobody cares', 'giving up', "what's the point", 'so tired of trying',
        'everything is dark',
    ],
}

def detect_risk_level(text: str) -> int:
    lower = text.lower()
    for level in [3, 2, 1]:
        if any(k in lower for k in RISK_KEYWORDS[level]):
            return level
    return 0


async def detect_risk_full(text: str) -> dict:
    keyword_level = detect_risk_level(text)
    classifier_level = None
    try:
        from services.signals import classify_risk
        classifier_level = await classify_risk(text)
    except Exception as e:
        print(f"[risk check error] {type(e).__name__}: {e}")
    return {
        "level": max(keyword_level, classifier_level or 0),
        "classifier_level": classifier_level,
        "keyword_level": keyword_level,
    }


async def detect_risk_augmented(text: str) -> int:
    """Back-compat wrapper. Prefer `detect_risk_full` when you need the
    continuous score too."""
    return (await detect_risk_full(text))["level"]

# ─────────────────────────────────────────────
# USER CONTEXT BUILDER
# ─────────────────────────────────────────────
TEST_NAMES = {
    "PHQ9": "Vibe Check", "GAD7": "Overthinking Check", "RSES": "Main Character Energy",
    "MOOD": "Vibe Check", "WORRY": "Overthinking Check", "SELFWORTH": "Main Character Energy",
    "BIGFIVE": "The Real You", "ATTACHMENT": "How You Love", "EQ": "Emotional IQ",
    "STRESS": "Under Pressure", "CAREERVALUES": "Your Work Why",
    "WORKENVIRONMENT": "Your Work Era", "LEADERSHIP": "Your Leader Type",
    "BURNOUT": "Burnout Check",
}

GAME_DISPLAY_NAMES = {
    "digit": "Number Sequence", "letter": "Letter Sequence", "math": "Math Patterns",
    "color": "Color Pattern", "spatial": "Pattern Memory", "spatial_reverse": "Reverse Spatial",
    "word": "Word Recall", "matrix": "Matrix Reasoning", "oddoneout": "Odd One Out",
    "series": "Series Completion", "analogy": "Visual Analogy", "paperfold": "Paper Folding",
}

def _format_memory_game_context(memory_history: list[dict]) -> list[str]:
    if not memory_history:
        return []
    lines = []
    total = len(memory_history)
    lines.append(f"Memory / cognitive game sessions played: {total}")
    by_type: dict[str, list[dict]] = {}
    for r in memory_history:
        gt = r.get("game_type", "unknown")
        by_type.setdefault(gt, []).append(r)
    for game_type, sessions in by_type.items():
        display = GAME_DISPLAY_NAMES.get(game_type, game_type)
        latest  = sessions[0]
        scores  = latest.get("scores") or {}
        rounds  = latest.get("rounds") or []
        stat_parts = [f"{k.replace('_', ' ')}: {v}" for k, v in scores.items() if v is not None]
        lines.append(f"  [{display}] - {len(sessions)} session(s). Latest stats: {', '.join(stat_parts) if stat_parts else 'no stats'}")
        if rounds:
            correct   = [r for r in rounds if r.get("correct")]
            failed    = [r for r in rounds if not r.get("correct")]
            max_level = max((r.get("level", 0) for r in rounds), default=0)
            lines.append(f"    Rounds: {len(rounds)} total, {len(correct)} correct, {len(failed)} failed. Max level reached: {max_level}")
            if failed:
                last_fail = failed[-1]
                seq_shown = last_fail.get("sequence") or last_fail.get("shown") or last_fail.get("words") or []
                mode      = last_fail.get("mode", "")
                fail_lvl  = last_fail.get("level", "?")
                mode_str  = f" ({mode} mode)" if mode else ""
                seq_str   = f" - sequence shown: {seq_shown}" if seq_shown else ""
                lines.append(f"    Last failed at level {fail_lvl}{mode_str}{seq_str}")
            modes_seen = list({r.get("mode") for r in rounds if r.get("mode")})
            if modes_seen:
                lines.append(f"    Modes attempted: {', '.join(modes_seen)}")
        if game_type in ("matrix", "oddoneout", "series", "analogy", "paperfold"):
            accuracy = scores.get("Accuracy") or scores.get("accuracy")
            max_lvl  = scores.get("Max level reached") or scores.get("max_level")
            if accuracy:
                lines.append(f"    Puzzle accuracy: {accuracy}")
            if max_lvl:
                lines.append(f"    Max level reached: {max_lvl}")
    return lines


def build_user_context(
    screening_history: list[dict] | None = None,
    memory_history:    list[dict] | None = None,
    mood_history:      list[dict] | None = None,
    cbt_modules:       list[dict] | None = None,
    journal_count:     int = 0,
    journal_tags:      list[str] | None = None,
    insight_summaries: list[dict] | None = None,
    user_name:         str | None = None,
) -> str:
    # Two distinct buckets so the model never confuses what it has OBSERVED
    # about the user (their actual activity and results) with who they ARE
    # (identity the user gave us). Everything observed is framed strictly as
    # "what this app has recorded" — not outside knowledge, not assumptions.
    observed: list[str] = []

    if mood_history:
        avg          = round(sum(m['score'] for m in mood_history) / len(mood_history), 1)
        recent       = mood_history[:3]
        recent_scores = [str(m['score']) for m in recent]
        notes        = [m['note'] for m in recent if m.get('note')]
        observed.append(f"Mood: average {avg}/10 across {len(mood_history)} logs. Recent scores: {', '.join(recent_scores)}.")
        if notes:
            observed.append(f"Recent mood notes: {'; '.join(notes[:2])}")
    if screening_history:
        results = [
            f"{TEST_NAMES.get(r['type'], r['type'])}: score {r['score']} ({r['severity']})"
            for r in screening_history[:6]
        ]
        observed.append(f"Self-reflection results: {', '.join(results)}")
    if cbt_modules:
        completed = [m['id'] for m in cbt_modules if m.get('completed')]
        remaining = [m['id'] for m in cbt_modules if not m.get('completed')]
        if completed:
            observed.append(f"Inner-work modules completed: {', '.join(completed)}")
        if remaining:
            observed.append(f"Inner-work modules not yet started: {', '.join(remaining)}")
    if journal_count > 0:
        observed.append(f"Journal entries written: {journal_count}")
        if journal_tags:
            observed.append(f"Recent journal themes: {', '.join(journal_tags[:6])}")
    if memory_history:
        observed.extend(_format_memory_game_context(memory_history))
    if insight_summaries:
        latest = insight_summaries[0]
        observed.append(f"Latest saved insight ({latest.get('title', 'Insight')}): {latest.get('content', '')[:300]}")

    if not observed and not user_name:
        return ""

    blocks = [
        "\n\nWHAT THIS APP KNOWS ABOUT THIS USER",
        "(This is the ONLY information you have about them. It comes entirely from their own activity inside this app — their logs, entries, results, and saved insights. Do not invent, assume, or imply knowledge of anything beyond what is listed here. If they ask what you know or remember about them, answer only from this.)",
    ]
    if user_name:
        blocks.append(f"\nWho they are:\n- They go by {user_name}. Use their name naturally in conversation, the way a friend would.")
    if observed:
        blocks.append("\nWhat they have done and recorded here:\n" + "\n".join(f"- {l}" for l in observed))
    return "\n".join(blocks)

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def _now_block() -> str:
    """Inject the actual current datetime so the model never invents a clock
    time. The LLM has no internal clock — without this, it cheerfully guesses."""
    from datetime import datetime
    now = datetime.now().astimezone()
    return (
        "\n\nCURRENT TIME (server clock):\n"
        f"- Now: {now.strftime('%A, %d %B %Y, %I:%M %p %Z').strip()}\n"
        "- Use this if the user asks for date/time. NEVER invent a different "
        "time. If the conversation is older than a few minutes, treat this as "
        "the current moment, not when the message was sent."
    )


def _build_messages(
    user_message:    str,
    history:         list[dict],
    risk_level:      int,
    user_context:    str,
    settings_prompt: str = "",
    priority_prompt: str = "",
) -> list[dict]:
    system = priority_prompt + _SYSTEM_PROMPT_CACHED
    # Inject settings before context so preferences shape everything
    if settings_prompt:
        system += settings_prompt
    if user_context:
        system += user_context
    system += _now_block()
    if risk_level >= 1:
        safety_notes = {
            1: "This person may have passive ideation. Respond with deep empathy, gently mention crisis resources.",
            2: "This person expressed active ideation. Prioritise safety. Provide crisis resources immediately.",
            3: "This person may be in imminent danger. Provide emergency resources only.",
        }
        system += f"\n\nSAFETY ALERT: {safety_notes[risk_level]}"
    messages = [{"role": "system", "content": system}]
    for msg in history[-6:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages

# ─────────────────────────────────────────────
# STREAMING CHAT  (Lumina chat surface → Groq, MODEL_LUMINA_CHAT)
# ─────────────────────────────────────────────
# Function names kept stable so routers/chat.py imports don't shift.
# Routes to settings.MODEL_LUMINA_CHAT on Groq.
def _chat_models() -> list[str]:
    chain: list[str] = []
    for m in (settings.MODEL_LUMINA_CHAT, settings.MODEL_SUMMARY, settings.MODEL_FALLBACK):
        if m and m not in chain:
            chain.append(m)
    return chain


def _create_chat(messages: list[dict], stream: bool):
    client = _client.with_options(max_retries=0)
    last_err: Exception | None = None
    for m in _chat_models():
        try:
            return client.chat.completions.create(
                model=m,
                messages=messages,
                max_tokens=1024,
                temperature=0.7,
                stream=stream,
                **model_kwargs(m),
            )
        except Exception as e:
            last_err = e
            print(f"[Groq chat] {m} failed ({type(e).__name__}), trying next model")
    raise last_err or RuntimeError("no chat model configured")


async def chat_with_llama_stream(
    user_message:    str,
    history:         list[dict],
    risk_level:      int = 0,
    user_context:    str = "",
    settings_prompt: str = "",
    priority_prompt: str = "",
):
    messages = _build_messages(user_message, history, risk_level, user_context, settings_prompt, priority_prompt)
    stripper = ThinkStripper()
    try:
        stream = _create_chat(messages, stream=True)
        for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                safe = stripper.feed(token)
                if safe:
                    yield safe
        tail = stripper.flush()
        if tail:
            yield tail
    except Exception as e:
        print(f"[Groq stream error] {type(e).__name__}: {e}")
        yield "Something went wrong. Please try again."

# ─────────────────────────────────────────────
# NON-STREAMING CHAT (fallback)  (Lumina chat surface → Groq)
# ─────────────────────────────────────────────
async def chat_with_llama(
    user_message:    str,
    history:         list[dict],
    risk_level:      int = 0,
    user_context:    str = "",
    settings_prompt: str = "",
    priority_prompt: str = "",
) -> str:
    messages = _build_messages(user_message, history, risk_level, user_context, settings_prompt, priority_prompt)
    try:
        response = _create_chat(messages, stream=False)
        text = response.choices[0].message.content or ""
        return _strip_em_dashes(_strip_think_tags(text))
    except Exception as e:
        print(f"[Groq error] {type(e).__name__}: {e}")
        return "Having trouble connecting. Please try again."

# ─────────────────────────────────────────────
# WARMUP — log every per-surface model so config drift is loud at boot
# ─────────────────────────────────────────────
async def warmup_model():
    print("[LLM] Per-surface routing (all Groq):")
    print(f"  Lumina chat        → {settings.MODEL_LUMINA_CHAT}")
    print(f"  Dashboard insight  → {settings.MODEL_DASHBOARD_INSIGHT}")
    print(f"  Orion chat         → {settings.MODEL_ORION_CHAT}")
    print(f"  Orion live event   → {settings.MODEL_ORION_LIVE_EVENT}")
    print(f"  Orion debrief      → {settings.MODEL_ORION_DEBRIEF}")
    print(f"  Orion right-panel  → {settings.MODEL_ORION_RIGHT_PANEL}")
    print(f"  Screening summary  → {settings.MODEL_SUMMARY}")
    print(f"  Crisis risk check  → {settings.MODEL_RISK}")

# ─────────────────────────────────────────────
# SUMMARY GENERATION  (Groq, per-surface model + fallback chain)
# ─────────────────────────────────────────────
def _strip_em_dashes(text: str) -> str:
    """Hard rule across the project: never let any dash variant longer than a
    regular hyphen reach the user. Em-dashes and en-dashes read as 'AI slop'.
    Server-side enforcement so no frontend prompt can leak one through.

    Covers every Unicode dash that gets used as a typographic em/en-dash:
        U+2010 HYPHEN
        U+2011 NON-BREAKING HYPHEN
        U+2012 FIGURE DASH
        U+2013 EN DASH
        U+2014 EM DASH
        U+2015 HORIZONTAL BAR
        U+2212 MINUS SIGN
        U+FE58 SMALL EM DASH
        U+FE63 SMALL HYPHEN-MINUS
        U+FF0D FULLWIDTH HYPHEN-MINUS
    Two-space-padded forms become ', ' (preserve flow). Bare forms become ','
    if word-adjacent, otherwise dropped."""
    if not text:
        return text
    import re
    text = re.sub(r"(?<=\w)[‐‑﹣－](?=\w)", "-", text)
    DASHES = "‐‑‒–—―−﹘﹣－"
    # Padded: ' — ' or ' -- ' style → ', '
    text = re.sub(rf"\s*[{DASHES}]+\s*", ", ", text)
    # Double-comma artifacts from chained replacements
    text = re.sub(r",\s*,", ",", text)
    # Comma at start of line after replacement
    text = re.sub(r"(^|\n)\s*,\s*", r"\1", text)
    # Trim duplicate spaces
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


def _strip_think_tags(text: str) -> str:
    """Qwen3 (and other reasoning models) emit visible <think>...</think>
    reasoning blocks in their output. Strip them before showing to the user,
    user wants only the final answer, not the model's internal monologue."""
    if not text:
        return text
    import re
    cleaned = re.sub(r'<think>[\s\S]*?</think>', '', text, flags=re.IGNORECASE)
    cleaned = re.sub(r'</?think>', '', cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


class ThinkStripper:
    """Stateful filter for streamed output. Drops every character that lies
    between <think> and </think> tags, even across chunk boundaries. Pass each
    incoming token through .feed(); the returned string is what's safe to ship
    to the user."""
    def __init__(self):
        self._buf = ""
        self._inside = False

    def feed(self, token: str) -> str:
        if not token:
            return ""
        self._buf += token
        out = []
        i = 0
        while i < len(self._buf):
            if not self._inside:
                open_idx = self._buf.lower().find("<think>", i)
                # Hold back any tail that might still be a partial '<think>' so
                # we don't accidentally emit it.
                safe_end = len(self._buf)
                tail = self._buf[max(safe_end - 7, i):]
                if "<think>".startswith(tail.lower()) and tail.lower() != "<think>":
                    safe_end -= len(tail)
                if open_idx == -1:
                    out.append(self._buf[i:safe_end])
                    self._buf = self._buf[safe_end:]
                    return "".join(out)
                else:
                    out.append(self._buf[i:open_idx])
                    i = open_idx + len("<think>")
                    self._inside = True
            else:
                close_idx = self._buf.lower().find("</think>", i)
                if close_idx == -1:
                    # Hold everything — still inside think block.
                    self._buf = self._buf[i:]
                    return "".join(out)
                else:
                    i = close_idx + len("</think>")
                    self._inside = False
        self._buf = ""
        return "".join(out)

    def flush(self) -> str:
        # Unterminated think block: drop the contents.
        rest = "" if self._inside else self._buf
        self._buf = ""
        self._inside = False
        return rest


async def generate_summary(
    prompt: str,
    model: str | None = None,
    fallback_models: list[str] | None = None,
    max_tokens: int = 600,
    temperature: float = 0.75,
) -> tuple[str, str]:
    """Return (summary_text, model_used). Walks a model chain so one Groq
    decommission can't break summaries. Empty string + "" if every model
    fails (caller decides what to render)."""
    primary = model or settings.MODEL_SUMMARY
    chain: list[str] = [primary]
    if fallback_models:
        chain.extend(m for m in fallback_models if m and m not in chain)
    else:
        # Default chain — keep stepping down model tiers so a Groq outage on
        # one model never kills summaries. Mix of large + small so a rate-limit
        # on the big one falls through to a cheap one instead of failing.
        for m in (
            settings.MODEL_LUMINA_CHAT,
            settings.MODEL_DASHBOARD_INSIGHT,
            settings.MODEL_SUMMARY,
            settings.MODEL_FALLBACK,
        ):
            if m and m not in chain:
                chain.append(m)

    last_err: Exception | None = None
    for m in chain:
        try:
            response = _client.chat.completions.create(
                model=m,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
                **model_kwargs(m),
            )
            msg = response.choices[0].message
            text = (getattr(msg, "content", None) or "").strip()
            # Defensive: reasoning models (gpt-oss family) sometimes emit the
            # final answer in `reasoning_content` while `content` is empty.
            if not text:
                text = (getattr(msg, "reasoning_content", None) or "").strip()
            text = _strip_think_tags(text)
            text = _strip_em_dashes(text)
            if text:
                if m != primary:
                    print(f"[Groq summary] primary '{primary}' failed; fell back to '{m}'.")
                return text, m
            print(f"[Groq summary] '{m}' returned empty; trying next in chain.")
        except Exception as e:
            last_err = e
            print(f"[Groq summary error on {m}] {type(e).__name__}: {e}")
    if last_err:
        print(f"[Groq summary] entire chain {chain} exhausted.")
    return "", ""

# ─────────────────────────────────────────────
# POST-PROCESSING
# ─────────────────────────────────────────────
def post_process_response(response: str, risk_level: int) -> str:
    diagnostic_phrases = [
        "you have depression", "you are depressed", "you have anxiety disorder",
        "you are diagnosed", "your diagnosis", "you are bipolar",
    ]
    for phrase in diagnostic_phrases:
        if phrase in response.lower():
            response += "\n\n*Note: I'm not qualified to provide diagnoses. Please consult a mental health professional.*"
            break
    return response

# ─────────────────────────────────────────────
# LEGACY STUBS
# ─────────────────────────────────────────────
async def get_http_client():
    return None

async def close_http_client():
    pass