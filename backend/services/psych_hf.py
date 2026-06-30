# backend/services/psych_hf.py
"""
Shared HuggingFace Inference API wrapper for the psychology augmentation layer.

Every per-page psych helper in `psych_per_page.py` routes through here. This
module owns:
    - Authentication (HF_API_KEY from settings)
    - Async HTTP via httpx with strict timeouts
    - SHA-256-keyed in-memory cache to stretch the free-tier quota
    - Server-side cache hint (`use_cache: true`) for further quota relief
    - `wait_for_model` on warmup + first miss so a 503 cold-start doesn't kill
      the augmentation
    - Fail-soft semantics — every error returns None, never raises to the caller

HF free-tier reality this module is built around:
    - ~300-1000 req/day soft cap depending on model size
    - Cold-start 503s ("model is currently loading, estimated 20s"). The
      `wait_for_model` request option holds the request server-side until the
      model is ready, which is cheaper than a client retry loop.
    - No SLA — every call is best-effort. The primary LLM path must never block.

Spectrum philosophy: this module returns the FULL classifier distribution
(every label with its float score). Per-page helpers decide how much of the
spectrum to surface for their use case. Nothing here truncates to binary.
"""

import asyncio
import hashlib
from collections import OrderedDict
from typing import Optional

import httpx

from config import settings

HF_BASE = "https://api-inference.huggingface.co/models"

# Per-process LRU cache, bounded to keep memory flat under load.
_CACHE: "OrderedDict[str, list[dict]]" = OrderedDict()
_CACHE_MAX = 1024


def _cache_key(model: str, text: str) -> str:
    h = hashlib.sha256(f"{model}::{text}".encode("utf-8")).hexdigest()
    return h


def _cache_get(key: str) -> Optional[list[dict]]:
    if key in _CACHE:
        _CACHE.move_to_end(key)
        return _CACHE[key]
    return None


def _cache_put(key: str, value: list[dict]) -> None:
    _CACHE[key] = value
    _CACHE.move_to_end(key)
    while len(_CACHE) > _CACHE_MAX:
        _CACHE.popitem(last=False)


def _augment_enabled() -> bool:
    return bool(settings.ENABLE_PSYCH_AUGMENT) and bool(settings.HF_API_KEY)


async def hf_classify(
    model: str,
    text: str,
    timeout: float = 3.0,
    wait_for_model: bool = False,
) -> Optional[list[dict]]:
    """
    Call a HuggingFace text-classification model and return the FULL
    [{label, score}, ...] distribution (spectrum, not truncated). Returns None
    on any failure (disabled, empty text, network error, rate limit, parse
    error). Never raises.

    Cold-start handling: a 503 on the first call triggers a single retry with
    `wait_for_model: true` and an extended timeout, which holds the request
    server-side until the model is loaded. After that the model stays warm and
    later calls are fast.
    """
    if not _augment_enabled():
        return None
    text = (text or "").strip()
    if not text:
        return None
    # Truncate aggressively — most psych classifiers cap at 512 tokens, and
    # rough char-budget keeps us safely under that without a tokenizer.
    payload_text = text[:1500]

    key = _cache_key(model, payload_text)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    headers = {"Authorization": f"Bearer {settings.HF_API_KEY}"}
    # `use_cache: true` is HF's server-side cache. Free — helps stretch quota.
    # `wait_for_model` (when True) blocks server-side until the model loads,
    # up to ~20s for cold start. Use sparingly: warmup + retry path only.
    body = {
        "inputs": payload_text,
        "options": {"use_cache": True, "wait_for_model": wait_for_model},
    }
    effective_timeout = 25.0 if wait_for_model else timeout

    try:
        async with httpx.AsyncClient(timeout=effective_timeout) as client:
            resp = await client.post(f"{HF_BASE}/{model}", json=body, headers=headers)

        # Cold-start path: 503 with estimated_time. Retry ONCE with
        # wait_for_model so the server holds the request through warmup.
        if resp.status_code == 503 and not wait_for_model:
            body_retry = {
                "inputs": payload_text,
                "options": {"use_cache": True, "wait_for_model": True},
            }
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(f"{HF_BASE}/{model}", json=body_retry, headers=headers)

        if resp.status_code == 429:
            # Free-tier rate limit. Fail-soft — primary LLM proceeds.
            print(f"[HF {model}] rate limited (429). Skipping augmentation.")
            return None
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"[HF {model} error] {type(e).__name__}: {e}")
        return None

    # Normalize: classifier endpoints return either [[{label,score},...]] or
    # [{label,score}, ...]. Some return {error: "..."}.
    if isinstance(data, dict) and "error" in data:
        print(f"[HF {model}] {data.get('error')}")
        return None
    if isinstance(data, list) and data:
        if isinstance(data[0], list):
            result = data[0]
        else:
            result = data
        # Validate shape
        if all(isinstance(item, dict) and "label" in item and "score" in item for item in result):
            _cache_put(key, result)
            return result
    return None


async def hf_warmup(model: str) -> bool:
    """
    Fire a tiny request with `wait_for_model: true` to kick the model out of
    cold storage at app boot. Returns True if the model responded with a valid
    classification, False otherwise. Result is cached, so the same dummy text
    used here also primes the cache for free.

    Use a neutral 7-word dummy so the request is real but tells us nothing
    about the user.
    """
    result = await hf_classify(model, "warming up the classifier model now please",
                                wait_for_model=True)
    return result is not None


async def _network_reachable() -> bool:
    """One-shot probe: can we resolve + reach api-inference.huggingface.co?
    Returns False on DNS/connect failure so we can skip the per-model warmup
    storm when the box is offline."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.head(HF_BASE)
        return True
    except Exception:
        return False


async def warmup_all_psych_models() -> None:
    """Concurrent warmup for every per-page psych model. Fire-and-forget."""
    if not _augment_enabled():
        print("[Psych] Augmentation disabled or HF_API_KEY missing — skipping warmup.")
        return
    targets = [
        settings.PSYCH_MODEL_CHAT,
        settings.PSYCH_MODEL_JOURNAL,
        settings.PSYCH_MODEL_CBT,
        settings.PSYCH_MODEL_CRISIS,
        settings.PSYCH_MODEL_SCREENING,
        settings.PSYCH_MODEL_ORION,
        settings.PSYCH_MODEL_DASHBOARD,
    ]
    if not await _network_reachable():
        print(f"[Psych] HuggingFace unreachable (offline/DNS). Skipping warmup for {len(targets)} models — will retry on first real call.")
        return
    print(f"[Psych] Warming {len(targets)} HF models (cold-start can take up to ~20s each)…")
    results = await asyncio.gather(*[hf_warmup(m) for m in targets], return_exceptions=True)
    for model, ok in zip(targets, results):
        status = "ready" if ok is True else "unavailable (will retry on first real call)"
        print(f"  {model}: {status}")


async def hf_classify_many(
    models_with_text: list[tuple[str, str]],
    timeout: float = 2.0,
) -> list[Optional[list[dict]]]:
    """Run several classifier calls concurrently. Order preserved."""
    return await asyncio.gather(
        *[hf_classify(m, t, timeout=timeout) for m, t in models_with_text]
    )


def top_label(scores: Optional[list[dict]]) -> Optional[str]:
    if not scores:
        return None
    return max(scores, key=lambda d: d.get("score", 0)).get("label")


def top_n(scores: Optional[list[dict]], n: int = 3) -> list[dict]:
    if not scores:
        return []
    return sorted(scores, key=lambda d: d.get("score", 0), reverse=True)[:n]


def full_distribution(scores: Optional[list[dict]]) -> list[dict]:
    """Return every label, sorted high-to-low. Spectrum view, no truncation."""
    if not scores:
        return []
    return sorted(scores, key=lambda d: d.get("score", 0), reverse=True)


def format_spectrum(scores: Optional[list[dict]], min_score: float = 0.0) -> str:
    """Render the full distribution as a compact prompt-friendly string."""
    if not scores:
        return ""
    return ", ".join(
        f"{d['label']}: {float(d['score']):.2f}"
        for d in full_distribution(scores)
        if float(d.get("score", 0)) >= min_score
    )


def find_label(scores: Optional[list[dict]], label_substr: str) -> float:
    """Return score for the first label whose name contains label_substr (case-insensitive)."""
    if not scores:
        return 0.0
    needle = label_substr.lower()
    for d in scores:
        if needle in d.get("label", "").lower():
            try:
                return float(d.get("score", 0))
            except (TypeError, ValueError):
                return 0.0
    return 0.0
