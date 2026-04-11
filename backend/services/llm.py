# backend/services/llm.py
from groq import Groq
from config import settings

# ─────────────────────────────────────────────
# CLIENT
# ─────────────────────────────────────────────
_client = Groq(api_key=settings.GROQ_API_KEY)
MODEL = "llama-3.3-70b-versatile"

PLATFORM_KNOWLEDGE = """
YOU HAVE BUILT-IN TOOLS. When a user asks about any of the features below, ALWAYS redirect them using TOOL_REDIRECT. Never describe how to do something externally when an in-app path exists.

═══════════════════════════════════════════════
TOP-LEVEL PAGES
═══════════════════════════════════════════════
/chat              - Talk to Lumina (you, here)
/journal           - Personal journal + mood logging
/crisis            - Crisis support, immediate help
/dashboard         - Full profile, history, insights

═══════════════════════════════════════════════
SELF-REFLECTION CHECKS  →  /screening
═══════════════════════════════════════════════
The page at /screening shows three category groups. Each test lives inside a category.
Users land on the category selector first, then pick a specific test.

Wellbeing checks:
  MOOD        - "Mood Check"           - PHQ-9 based wellbeing check
  WORRY       - "Mind and Worry"       - GAD-7 based anxiety check
  SELFWORTH   - "How You See Yourself" - Rosenberg self-esteem scale

Personality checks:
  BIGFIVE     - "Who You Are"                    - Big Five personality
  ATTACHMENT  - "How You Connect"                - Attachment style
  EQ          - "Your Emotional Intelligence"    - Emotional intelligence
  STRESS      - "Stress and Coping"              - Coping style

Career checks:
  CAREERVALUES    - "What Work Means to You"    - Career motivation
  WORKENVIRONMENT - "Where You Work Best"       - Work environment preferences
  LEADERSHIP      - "How You Lead"              - Leadership vs contributor style
  BURNOUT         - "Your Energy and Limits"    - Burnout indicators

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
REDIRECT SYNTAX - CRITICAL, ALWAYS USE THIS EXACTLY
═══════════════════════════════════════════════
End your message with this on its own line - no extra text after it:
TOOL_REDIRECT:{"name":"Display Name","path":"/exact/path","description":"one warm sentence naming the specific check, module, or game"}

Correct examples:
  TOOL_REDIRECT:{"name":"Mind and Worry","path":"/screening?test=WORRY","description":"The Mind and Worry check might give you a clearer picture of what is going on."}
  TOOL_REDIRECT:{"name":"How You See Yourself","path":"/screening?test=SELFWORTH","description":"The How You See Yourself check looks at how you have been relating to yourself."}
  TOOL_REDIRECT:{"name":"Who You Are","path":"/screening?test=BIGFIVE","description":"The Who You Are check gives a picture of how you tend to move through the world."}
  TOOL_REDIRECT:{"name":"How You Connect","path":"/screening?test=ATTACHMENT","description":"The How You Connect check looks at your patterns in close relationships."}
  TOOL_REDIRECT:{"name":"Mood Check","path":"/screening?test=MOOD","description":"The Mood Check gives you a clearer picture of how you have been feeling lately."}
  TOOL_REDIRECT:{"name":"Your Energy and Limits","path":"/screening?test=BURNOUT","description":"The Your Energy and Limits check reflects how work has been affecting you."}
  TOOL_REDIRECT:{"name":"Stress and Coping","path":"/screening?test=STRESS","description":"The Stress and Coping check maps how you respond when things get hard."}
  TOOL_REDIRECT:{"name":"Thought Patterns","path":"/cbt?module=distortion","description":"The Thought Patterns exercise helps you notice what your mind is telling you."}
  TOOL_REDIRECT:{"name":"Finding Your Ground","path":"/cbt?module=esteem","description":"The Finding Your Ground exercise gently helps you reconnect with your own worth."}
  TOOL_REDIRECT:{"name":"Rewriting the Story","path":"/cbt?module=reframing","description":"The Rewriting the Story exercise finds a kinder, more accurate version of things."}
  TOOL_REDIRECT:{"name":"Facing What Scares You","path":"/cbt?module=exposure","description":"The Facing What Scares You exercise builds courage one small step at a time."}
  TOOL_REDIRECT:{"name":"Contain the Worry","path":"/cbt?module=worrytime","description":"The Contain the Worry exercise gives your anxious thoughts a specific time and place."}
  TOOL_REDIRECT:{"name":"What Matters to You","path":"/cbt?module=values","description":"The What Matters to You exercise helps clarify what you want to move toward."}
  TOOL_REDIRECT:{"name":"Getting Moving Again","path":"/cbt?module=activation","description":"The Getting Moving Again exercise rebuilds energy through small actions."}
  TOOL_REDIRECT:{"name":"Building Something Good","path":"/cbt?module=habit","description":"The Building Something Good exercise plants one small wellbeing habit."}
  TOOL_REDIRECT:{"name":"Number Sequence","path":"/cognitive/memory","description":"Try the Number Sequence game to see how your working memory is doing today."}
  TOOL_REDIRECT:{"name":"Matrix Reasoning","path":"/cognitive/memory","description":"The Matrix Reasoning puzzle tests fluid intelligence through visual pattern grids."}
  TOOL_REDIRECT:{"name":"Visual Analogy","path":"/cognitive/memory","description":"The Visual Analogy game measures how well you spot relationships between shapes."}
  TOOL_REDIRECT:{"name":"Memory Games","path":"/cognitive/memory","description":"Seven memory games plus five fluid intelligence puzzles - pick what calls to you."}

NEVER write a path as plain text in your response body.
NEVER say "go to /cbt" or "click /screening" - the redirect widget handles all navigation.

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

You are NOT a therapist. You DO have built-in tools for self-reflection, journaling, CBT, and more - use them.

Personality:
- Casual, warm, natural - match user energy
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
        'about to end it', 'going to kill myself', 'have a plan', 'tonight is the night', 'goodbye everyone', 'final message', 
        'can\'t take it anymore', 'ending it all', 'taking my own life', 'ready to die'
    ],
    2: [
        'kill myself', 'end my life', 'want to die', 'suicidal', 'hurt myself', 'self harm', 
        'wish i wasn\'t here', 'wish i wouldn\'t wake up', 'better off dead', 'rather be dead', 'end this pain'
    ],
    1: [
        'wish i was dead', 'dont want to be here', 'worthless', 'hopeless', 'no point', 'nobody cares', 
        'giving up', 'what\'s the point', 'so tired of trying', 'everything is dark'
    ],
}

def detect_risk_level(text: str) -> int:
    lower = text.lower()
    for level in [3, 2, 1]:
        if any(k in lower for k in RISK_KEYWORDS[level]):
            return level
    return 0

# ─────────────────────────────────────────────
# USER CONTEXT BUILDER
# ─────────────────────────────────────────────
TEST_NAMES = {
    "PHQ9": "Mood Check", "GAD7": "Mind and Worry", "RSES": "How You See Yourself",
    "MOOD": "Mood Check", "WORRY": "Mind and Worry", "SELFWORTH": "How You See Yourself",
    "BIGFIVE": "Who You Are", "ATTACHMENT": "How You Connect", "EQ": "Emotional Intelligence",
    "STRESS": "Stress and Coping", "CAREERVALUES": "What Work Means to You",
    "WORKENVIRONMENT": "Where You Work Best", "LEADERSHIP": "How You Lead and Contribute",
    "BURNOUT": "Your Energy and Limits",
}

GAME_DISPLAY_NAMES = {
    # Working memory games
    "digit":           "Number Sequence",
    "letter":          "Letter Sequence",
    "math":            "Math Patterns",
    "color":           "Color Pattern",
    "spatial":         "Pattern Memory",
    "spatial_reverse": "Reverse Spatial",
    "word":            "Word Recall",
    # Fluid intelligence / puzzle games
    "matrix":          "Matrix Reasoning",
    "oddoneout":       "Odd One Out",
    "series":          "Series Completion",
    "analogy":         "Visual Analogy",
    "paperfold":       "Paper Folding",
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
        latest = sessions[0]
        scores = latest.get("scores") or {}
        rounds = latest.get("rounds") or []

        stat_parts = []
        for key, val in scores.items():
            if val is not None:
                readable = key.replace("_", " ")
                stat_parts.append(f"{readable}: {val}")

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

            if game_type == "word":
                total_shown    = sum(len(r.get("words", [])) for r in rounds)
                total_recalled = sum(
                    len([w for w in r.get("recalled", []) if w in r.get("words", [])])
                    for r in rounds
                )
                if total_shown > 0:
                    pct = round(total_recalled / total_shown * 100)
                    lines.append(f"    Overall word recall accuracy: {pct}% ({total_recalled}/{total_shown})")

            if game_type == "color":
                max_colors = max((len(r.get("sequence", [])) for r in rounds), default=0)
                lines.append(f"    Longest color pattern attempted: {max_colors} colors")

        # Extra context for puzzle/fluid intelligence games
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
    memory_history: list[dict] | None = None,
    mood_history: list[dict] | None = None,
    cbt_modules: list[dict] | None = None,
    journal_count: int = 0,
    journal_tags: list[str] | None = None,
    insight_summaries: list[dict] | None = None,
    user_name: str | None = None,
) -> str:
    lines = []

    if user_name:
        lines.append(f"User's name: {user_name} - use their name naturally in conversation, the way a friend would")

    if mood_history:
        avg = round(sum(m['score'] for m in mood_history) / len(mood_history), 1)
        recent = mood_history[:3]
        recent_scores = [str(m['score']) for m in recent]
        notes = [m['note'] for m in recent if m.get('note')]
        lines.append(f"Mood: average {avg}/10 across {len(mood_history)} logs. Recent scores: {', '.join(recent_scores)}.")
        if notes:
            lines.append(f"Recent mood notes: {'; '.join(notes[:2])}")

    if screening_history:
        results = [
            f"{TEST_NAMES.get(r['type'], r['type'])}: score {r['score']} ({r['severity']})"
            for r in screening_history[:6]
        ]
        lines.append(f"Self-reflection results: {', '.join(results)}")

    if cbt_modules:
        completed = [m['id'] for m in cbt_modules if m.get('completed')]
        remaining = [m['id'] for m in cbt_modules if not m.get('completed')]
        if completed:
            lines.append(f"CBT modules completed: {', '.join(completed)}")
        if remaining:
            lines.append(f"CBT modules not yet started: {', '.join(remaining)}")

    if journal_count > 0:
        lines.append(f"Journal entries written: {journal_count}")
        if journal_tags:
            lines.append(f"Recent journal themes: {', '.join(journal_tags[:6])}")

    if memory_history:
        memory_lines = _format_memory_game_context(memory_history)
        lines.extend(memory_lines)

    if insight_summaries:
        latest = insight_summaries[0]
        lines.append(f"Latest saved insight ({latest.get('title', 'Insight')}): {latest.get('content', '')[:300]}")

    if not lines:
        return ""

    return "\n\nUSER CONTEXT (use this to speak specifically about their data):\n" + "\n".join(f"- {l}" for l in lines)

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def _build_messages(user_message: str, history: list[dict], risk_level: int, user_context: str) -> list[dict]:
    system = _SYSTEM_PROMPT_CACHED
    if user_context:
        system += user_context
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
# STREAMING CHAT
# ─────────────────────────────────────────────
async def chat_with_llama_stream(
    user_message: str,
    history: list[dict],
    risk_level: int = 0,
    user_context: str = "",
):
    messages = _build_messages(user_message, history, risk_level, user_context)
    try:
        stream = _client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
            stream=True,
        )
        for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                yield token
    except Exception as e:
        print(f"[Groq stream error] {type(e).__name__}: {e}")
        yield "Something went wrong. Please try again."

# ─────────────────────────────────────────────
# NON-STREAMING CHAT (fallback)
# ─────────────────────────────────────────────
async def chat_with_llama(
    user_message: str,
    history: list[dict],
    risk_level: int = 0,
    user_context: str = "",
) -> str:
    messages = _build_messages(user_message, history, risk_level, user_context)
    try:
        response = _client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[Groq error] {type(e).__name__}: {e}")
        return "Having trouble connecting. Please try again."

# ─────────────────────────────────────────────
# WARMUP
# ─────────────────────────────────────────────
async def warmup_model():
    print(f"[Groq] Using {MODEL} - no warmup needed.")

# ─────────────────────────────────────────────
# SUMMARY GENERATION
# ─────────────────────────────────────────────
async def generate_summary(prompt: str) -> str:
    try:
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0.75,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"[Groq summary error] {type(e).__name__}: {e}")
        return ""

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