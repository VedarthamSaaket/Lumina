# backend/services/psych_specialty.py
"""
Specialty psychology LLMs (Layer B).

Hosts 8B+ models that are too heavy for the HuggingFace Serverless free tier:

    Page       | Model                              | Spec
    -----------|------------------------------------|--------------------------------------------
    /cbt       | PsyLLM-8B                          | DSM-5/ICD-11 + CBT/ACT/psychodynamic
    /chat      | PsychoCounsel-Llama3               | therapist decision-alignment critic
    /screening | PsychoLexLLaMA-8B                  | academic psych theory enrichment
    /dashboard | MentaLLaMA-7B/13B                  | interpretable diagnostic justification

Hosting model
-------------
Each specialty model runs in its own Google Colab T4 notebook (templates live
under /colab/). The notebook starts FastAPI inside the cell, loads the model
onto VRAM, then opens a pyngrok tunnel and prints a public HTTPS base URL.
Paste that URL into the matching COLAB_URL_* env var.

Contract every worker notebook must expose:

    POST {base_url}/infer
        body:    {"prompt": str, "max_new_tokens": int = 256, "temperature": float = 0.7}
        returns: {"text": str}

    GET  {base_url}/health
        returns: {"ok": true, "model": "<id>"}

Fail-soft semantics: if the ngrok URL is blank, the notebook is asleep, or the
request times out, every helper here returns None and the calling page falls
back to its small HF classifier (Layer A) + primary Groq LLM. The user never
sees a hard failure.
"""

import asyncio
from typing import Optional

import httpx

from config import settings
from services import specialty_registry, specialty_lifecycle


def _enabled() -> bool:
    return bool(settings.ENABLE_SPECIALTY_PSYCH)


async def _call_worker(
    model_key: str,
    prompt: str,
    max_new_tokens: int = 256,
    temperature: float = 0.7,
    timeout: float = 30.0,
) -> Optional[str]:
    """
    Resolve model_key → live worker URL via specialty_registry (Lightning →
    Kaggle → manual Colab env fallback). POST /infer. Fail-soft to None.
    """
    if not _enabled():
        return None
    base_url = specialty_registry.resolve(model_key)
    if not base_url:
        # Fire-and-forget wake; this request still degrades to Layer A.
        asyncio.create_task(specialty_lifecycle.ensure_warm(model_key))
        return None
    url = f"{base_url.rstrip('/')}/infer"
    payload = {
        "prompt": prompt,
        "max_new_tokens": max_new_tokens,
        "temperature": temperature,
        "model_key": model_key,
    }
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(url, json=payload, params={"model": model_key})
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"[specialty {model_key} @ {base_url}] {type(e).__name__}: {e}")
        return None
    if isinstance(data, dict):
        for key in ("text", "response", "output", "generated_text"):
            v = data.get(key)
            if isinstance(v, str) and v.strip():
                return v.strip()
    return None


async def health_check(model_key: str, timeout: float = 5.0) -> bool:
    if not _enabled():
        return False
    base_url = specialty_registry.resolve(model_key)
    if not base_url:
        return False
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(f"{base_url.rstrip('/')}/health")
        return resp.status_code == 200
    except Exception:
        return False


# ─── /cbt — PsyLLM (DSM-5 + CBT/ACT structured analysis) ──────────────────────
async def psyllm_cbt_analyze(reframing_text: str, module_id: str) -> Optional[str]:
    if not reframing_text.strip():
        return None
    prompt = (
        f"You are PsyLLM. Apply DSM-5 / ICD-11 + CBT / ACT framing to the "
        f"user's reframing or thought-record entry from the '{module_id}' "
        f"module. In 3 sentences: (1) the cognitive distortion pattern most "
        f"present, (2) one CBT or ACT technique that fits, (3) a non-diagnostic "
        f"reframe the user could try.\n\n"
        f"Entry: {reframing_text[:1500]}\n\nAnalysis:"
    )
    return await _call_worker("psyllm", prompt, max_new_tokens=220, temperature=0.5)


# ─── /chat — PsychoCounsel-Llama3 (therapist-aligned critic) ──────────────────
async def psychocounsel_critic(user_message: str, draft_reply: str, risk_level: int) -> Optional[str]:
    """
    Critique the primary chat draft against therapist decision-making norms.
    Returns either an improved reply (if the critic edits it) or None to keep
    the original draft. Called only for risk_level ≥ 1 in chat.py.
    """
    if not draft_reply.strip():
        return None
    prompt = (
        "You are PsychoCounsel, aligned with how a professional psychotherapist "
        "would respond. Rewrite the assistant draft if any of these are violated:\n"
        "- diagnostic claims (\"you have X\", \"you are X\")\n"
        "- minimization of distress\n"
        f"- missing crisis resource at risk_level={risk_level}\n"
        "- response pushes too hard given the user's affect\n\n"
        "If the draft already meets clinical-counseling norms, return it verbatim.\n"
        "Preserve the warm tone of the assistant. Do not add headers or labels.\n\n"
        f"User message: {user_message[:800]}\n\n"
        f"Assistant draft: {draft_reply[:1500]}\n\n"
        "Final reply:"
    )
    return await _call_worker("psychocounsel", prompt, max_new_tokens=400, temperature=0.6)


# ─── /screening — PsychoLexLLaMA (academic terminology enrichment) ────────────
async def psycholex_screening_enrich(test_type: str, severity: str, contexts: list[str]) -> Optional[str]:
    text = " ".join(c for c in contexts if c)[:1500]
    if not text:
        return None
    prompt = (
        f"You are PsychoLexLLaMA. The user just completed the {test_type} "
        f"self-check and scored in the '{severity}' range. Drawing on academic "
        f"psychological literature, write a 2-sentence note for an internal "
        f"summary prompt that names the theoretical construct most relevant to "
        f"this profile (e.g., learned helplessness, hyperarousal, attachment "
        f"avoidance) and one well-supported intervention family. No diagnoses.\n\n"
        f"User context: {text}\n\nNote:"
    )
    return await _call_worker("psycholex", prompt, max_new_tokens=160, temperature=0.4)


# ─── /dashboard — MentaLLaMA (interpretable diagnostic justification) ─────────
async def mentallama_dashboard_justify(aggregated_text: str) -> Optional[str]:
    if not aggregated_text.strip():
        return None
    prompt = (
        "You are MentaLLaMA. Analyse this user's recent activity log and give "
        "an interpretable summary of the affective pattern. Output 3 short "
        "lines, each starting with 'BECAUSE:'. Each line must justify ONE "
        "observation with a specific data point and connect it to a recognised "
        "mental-health construct (no diagnosis). The reader will weave these "
        "into a warm insight summary — be neutral, not alarmist.\n\n"
        f"Activity log: {aggregated_text[:2000]}\n\nJustifications:"
    )
    return await _call_worker("mentallama", prompt, max_new_tokens=240, temperature=0.5)


# ─── Bulk health probe (used by /api/psych/warmup) ───────────────────────────
async def specialty_health_snapshot() -> dict:
    if not _enabled():
        return {"enabled": False}
    keys = ("psyllm", "psychocounsel", "psycholex", "mentallama")
    results = await asyncio.gather(*[health_check(k) for k in keys])
    snap = specialty_registry.snapshot()
    return {
        "enabled":  True,
        "alive":    {k: ok for k, ok in zip(keys, results)},
        "registry": snap,
    }
