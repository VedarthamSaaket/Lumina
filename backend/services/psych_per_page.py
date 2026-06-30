# backend/services/psych_per_page.py
"""
Per-page psychology augmentation helpers.

Every Lumina page gets its own specialized HuggingFace classifier. Each helper
wraps a single HF call and shapes the result for that page's specific use.

Spectrum philosophy
-------------------
Nothing here is binary. Every helper surfaces the FULL classifier distribution
(every label with its float score) instead of a thresholded yes/no. Downstream
LLMs and storage layers receive the spectrum so they can reason about
intensity, ambiguity, and emotion mixes — not just a "this is the label" call.

Risk specifically: `crisis_risk_score` returns a continuous probability in
[0, 1], and `risk_score_to_level` quantizes it into Lumina's 0-3 branching
levels only when the rest of the system genuinely needs an int (crisis flow
gating). The float is kept and logged alongside.

Page          | Model                                                | Returns
--------------|------------------------------------------------------|------------------------------------
/chat         | j-hartmann/emotion-english-distilroberta-base        | PSYCH_SIGNAL prompt block (str)
/journal      | SamLowe/roberta-base-go_emotions                     | top-6 emotion tags (list[str])
/cbt          | mental/mental-bert-base-uncased                      | mental-health spectrum dict
/crisis       | sentinet/suicidality                                 | continuous risk score 0..1 (float)
/screening    | cardiffnlp/twitter-roberta-base-sentiment-latest     | sentiment spectrum dict
/orion        | cardiffnlp/twitter-roberta-base-emotion              | ENGAGEMENT_SIGNAL prompt block (str)
/dashboard    | bhadresh-savani/distilbert-base-uncased-emotion      | emotion-aggregate prompt block (str)

Every helper is fail-soft: any HF outage returns an empty result and the
primary code path proceeds as if augmentation was disabled.
"""

from typing import Optional

from config import settings
from services.psych_hf import (
    hf_classify,
    top_n,
    top_label,
    find_label,
    full_distribution,
    format_spectrum,
)


def _spectrum_payload(scores, label: str) -> dict:
    """Render a full spectrum as a storage-friendly dict."""
    dist = full_distribution(scores)
    return {
        "model": label,
        "spectrum": [
            {"label": d["label"], "score": round(float(d.get("score", 0.0)), 4)}
            for d in dist
        ],
        "top": dist[0]["label"] if dist else None,
        "top_score": round(float(dist[0].get("score", 0.0)), 4) if dist else 0.0,
    }


# ── /chat ─────────────────────────────────────────────────────────────────────
async def chat_emotion_signal(user_message: str) -> str:
    """Pre-classify a chat message and return a PSYCH_SIGNAL block to inject.
    Surfaces the FULL 7-emotion distribution so the LLM sees intensity, not
    just the top label."""
    scores = await hf_classify(settings.PSYCH_MODEL_CHAT, user_message)
    full = full_distribution(scores)
    if not full:
        return ""
    spectrum = format_spectrum(full)
    return (
        "\n\nPSYCH_SIGNAL (internal — never name emotions back to the user):\n"
        f"- full emotion spectrum: {spectrum}\n"
        "- Read this as intensity, not a label. A high single score = strong "
        "single feeling; a flat spread = ambivalence. Match warmth and pacing "
        "accordingly. Do not quote the labels back."
    )


# ── /journal ──────────────────────────────────────────────────────────────────
async def journal_emotion_tags(entry_text: str) -> list[str]:
    """Return up to 6 emotion labels (GoEmotions, 28-class). Low threshold so
    secondary/tertiary feelings still tag — spectrum, not winner-takes-all."""
    scores = await hf_classify(settings.PSYCH_MODEL_JOURNAL, entry_text)
    dist = full_distribution(scores)
    return [
        d["label"].lower()
        for d in dist[:6]
        if float(d.get("score", 0.0)) >= 0.05
        and d.get("label", "").lower() != "neutral"
    ]


async def journal_emotion_spectrum(entry_text: str) -> dict:
    """Full GoEmotions spectrum for storage / future context use."""
    scores = await hf_classify(settings.PSYCH_MODEL_JOURNAL, entry_text)
    return _spectrum_payload(scores, settings.PSYCH_MODEL_JOURNAL)


# ── /cbt ──────────────────────────────────────────────────────────────────────
async def cbt_distortion_signal(freetext: str) -> dict:
    """Mental-health-domain spectrum over reframing / distortion text.
    Stored alongside CBT progress for future coaching to read."""
    scores = await hf_classify(settings.PSYCH_MODEL_CBT, freetext)
    return _spectrum_payload(scores, settings.PSYCH_MODEL_CBT) if scores else {}


# ── /crisis ───────────────────────────────────────────────────────────────────
async def crisis_risk_score(text: str) -> float:
    """
    Continuous suicide-ideation probability in [0, 1]. NEVER binary.
    Augments the keyword detector — picks up subtle phrasings the wordlist
    can't.
    """
    scores = await hf_classify(settings.PSYCH_MODEL_CRISIS, text)
    if not scores:
        return 0.0
    # Look for any label that signals suicide / ideation / risk
    for needle in ("suicide", "ideation", "suicidal", "risk", "label_1", "positive"):
        s = find_label(scores, needle)
        if s > 0:
            return float(s)
    # Fall back: if the top label clearly reads as "safe", return 0; otherwise
    # treat the highest score as a positive signal (we keep it as a continuous
    # value, not a hard yes/no).
    top = top_label(scores) or ""
    if any(safe in top.lower() for safe in ("safe", "label_0", "negative", "no_risk")):
        return 0.0
    return float(scores[0].get("score", 0.0))


def risk_score_to_level(score: float) -> int:
    """
    Quantize a continuous suicidality probability onto Lumina's 0-3 risk_level.
    The thresholds keep the spectrum smooth: every 25 percentage points of
    confidence steps the level. The caller still has access to the float.
    """
    if score >= 0.85:
        return 3
    if score >= 0.65:
        return 2
    if score >= 0.40:
        return 1
    return 0


# ── /screening ────────────────────────────────────────────────────────────────
async def screening_sentiment_signal(contexts: list[str]) -> dict:
    """Full sentiment spectrum over the user's free-text screening contexts."""
    if not contexts:
        return {}
    text = " ".join(c for c in contexts if c)[:1500]
    scores = await hf_classify(settings.PSYCH_MODEL_SCREENING, text)
    return _spectrum_payload(scores, settings.PSYCH_MODEL_SCREENING) if scores else {}


# ── /orion ────────────────────────────────────────────────────────────────────
async def orion_engagement_signal(user_message: str) -> str:
    """4-class Twitter emotion classifier (anger / joy / optimism / sadness).
    Returns the FULL distribution so Orion can read mixed states (e.g. joy
    + frustration during a hard win) rather than top-1 only."""
    scores = await hf_classify(settings.PSYCH_MODEL_ORION, user_message)
    full = full_distribution(scores)
    if not full:
        return ""
    spectrum = format_spectrum(full)
    return (
        "\n\nENGAGEMENT_SIGNAL (internal — never name emotions back to the user):\n"
        f"- full engagement spectrum: {spectrum}\n"
        "- Read it as a blend, not a single state. High anger+sadness = soften "
        "the push, validate friction. High optimism+joy = stretch with a "
        "harder strategy or a fun fact. A flat spread = stay neutral, ask a "
        "curious question."
    )


# ── /dashboard ────────────────────────────────────────────────────────────────
async def dashboard_emotion_aggregate(aggregated_text: str) -> str:
    """6-emotion spectrum over aggregated user data. Appended to insight prompt
    so the synthesis model has emotion-distribution context, not just a top
    label."""
    scores = await hf_classify(settings.PSYCH_MODEL_DASHBOARD, aggregated_text)
    full = full_distribution(scores)
    if not full:
        return ""
    spectrum = format_spectrum(full)
    return (
        "\n\nDETECTED EMOTION SPECTRUM across this user's recent data: "
        f"{spectrum}. Weave this into the insight gently — do not name it as a "
        "clinical finding. Use it to ground the warmth and direction of the "
        "summary. Where two emotions are both prominent, acknowledge the mix."
    )
