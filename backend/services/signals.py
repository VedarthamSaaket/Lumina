import asyncio
import json
import re
from typing import Optional

from groq import Groq

from config import settings

_client = Groq(api_key=settings.GROQ_API_KEY, max_retries=0, timeout=6.0)

_RISK_POLICY = """You classify one message a person wrote to a wellbeing companion for suicide and self-harm risk.
Levels:
0 = no risk. Includes ordinary sadness, stress, anger, jokes and figures of speech such as "this is killing me" or "im dead lol", and talk about someone else's death or grief.
1 = passive: hopelessness about living, feeling like a burden, wishing to disappear or not wake up, no stated intent to act.
2 = active: says they want to die, kill or hurt themselves, or are thinking about doing it, without an immediate plan. Slang such as "unalive myself" or "kms" counts.
3 = imminent: a plan, means, a time, a goodbye, or says they are about to act or already started. Having the means at hand (pills, a blade, a rope, a weapon, a height) together with intent, or naming a time such as tonight, is always 3.
When unsure between two levels choose the higher one.
Reply with JSON only: {"level": 0-3}"""

_TAGS_PROMPT = (
    "Read this private journal entry and name the feelings in it. Reply with JSON only: "
    '{"tags": [...]} holding one to five single lowercase everyday feeling words, strongest first. '
    "Use an empty list when the entry carries no clear feeling."
)


def _models(*names: str) -> list[str]:
    chain: list[str] = []
    for name in names:
        if name and name not in chain:
            chain.append(name)
    return chain


def _ask(models: list[str], system: str, user: str, max_tokens: int) -> Optional[str]:
    for model in models:
        try:
            response = _client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                max_tokens=max_tokens,
                temperature=0,
                reasoning_effort="low",
            )
            text = (response.choices[0].message.content or "").strip()
            if text:
                return text
        except Exception as e:
            print(f"[signals] {model} failed ({type(e).__name__})")
    return None


async def classify_risk(text: str) -> Optional[int]:
    text = (text or "").strip()
    if not text:
        return 0
    raw = await asyncio.to_thread(
        _ask, _models(settings.MODEL_RISK, settings.MODEL_FALLBACK), _RISK_POLICY, text[:2000], 300
    )
    match = re.search(r'"level"\s*:\s*([0-3])', raw or "")
    return int(match.group(1)) if match else None


async def journal_tags(text: str) -> list[str]:
    text = (text or "").strip()
    if len(text) < 12:
        return []
    raw = await asyncio.to_thread(
        _ask, _models(settings.MODEL_FALLBACK, settings.MODEL_SUMMARY), _TAGS_PROMPT, text[:2500], 300
    )
    match = re.search(r"\{.*\}", raw or "", re.S)
    if not match:
        return []
    try:
        tags = json.loads(match.group(0)).get("tags", [])
    except (json.JSONDecodeError, AttributeError):
        return []
    clean = [str(t).strip().lower() for t in tags if isinstance(t, str) and re.fullmatch(r"[A-Za-z][A-Za-z -]{1,20}", t.strip())]
    return list(dict.fromkeys(clean))[:5]


_REVIEW_PROMPT = (
    "You review one draft reply from a warm wellbeing companion to a person who may be at risk "
    "(risk level {risk} on a 0 to 3 scale). Rewrite the draft only if it does any of these: states or implies a "
    "diagnosis, minimises or brushes past the distress, lectures or pushes advice too hard, sounds cold, or at "
    "risk level 1 or higher leaves out a crisis line (iCall 9152987821, or text HOME to 741741). "
    "Keep the same warm voice, plain everyday words, similar length, and never use em-dashes. "
    'Reply with JSON only: {{"ok": true}} when the draft is fine, otherwise {{"ok": false, "reply": "<the rewritten reply>"}}.'
)

_SCREENING_PROMPT = (
    "You write a two sentence internal note for a companion app that is about to summarise a self-check result. "
    "Name the one well-established psychological idea most relevant to this result and one evidence-based kind of "
    "support that tends to help. No diagnosis, and write about the person in third person."
)


async def review_reply(user_message: str, draft: str, risk_level: int) -> Optional[str]:
    if not draft.strip():
        return None
    raw = await asyncio.to_thread(
        _ask,
        _models(settings.MODEL_SUMMARY, settings.MODEL_FALLBACK),
        _REVIEW_PROMPT.format(risk=risk_level),
        f"Person wrote: {user_message[:800]}\n\nDraft reply: {draft[:1800]}",
        900,
    )
    match = re.search(r"\{.*\}", raw or "", re.S)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    reply = data.get("reply") if isinstance(data, dict) and data.get("ok") is False else None
    if not isinstance(reply, str) or len(reply.strip()) < 20:
        return None
    return reply.strip().replace("\u2014", ", ").replace("\u2013", ", ")


async def screening_note(test_type: str, severity: str, score: int, contexts: list[str]) -> Optional[str]:
    notes = " ".join(c.strip() for c in contexts if c and c.strip())[:1200]
    user = f"Self-check: {test_type}. Result band: {severity}. Score: {score}."
    if notes:
        user += f" What the person added in their own words: {notes}"
    return await asyncio.to_thread(
        _ask, _models(settings.MODEL_FALLBACK, settings.MODEL_SUMMARY), _SCREENING_PROMPT, user, 400
    )
