# backend/routers/psych_warmup.py
"""
Warmup-on-demand endpoints.

The frontend hits these the moment a user opens a page that uses the psych
layer (e.g. /screening, /cbt, /chat). The backend fires the matching HF
classifier(s) AND a health probe on the matching specialty Colab worker.

Logic
-----
By the time the user finishes interacting (writing a journal entry, taking a
PHQ-9, typing a chat message), the small HF classifier is warm and the Colab
worker has been pinged. The 10-20 s HF cold-start hides under the user's
interaction time — exactly the pattern the user asked for.

These endpoints are intentionally idempotent and very cheap. Spamming them is
fine; the LRU cache in `psych_hf` absorbs repeats.
"""

import asyncio
from fastapi import APIRouter

from config import settings
from services.psych_hf import hf_warmup
from services.psych_specialty import specialty_health_snapshot

router = APIRouter(prefix="/api/psych", tags=["psych"])


# Maps frontend page slugs to (small HF classifier model, specialty colab key)
_PAGE_MAP: dict[str, tuple[str, str | None]] = {
    "chat":      ("PSYCH_MODEL_CHAT",      "COLAB_URL_PSYCHOCOUNSEL"),
    "journal":   ("PSYCH_MODEL_JOURNAL",   None),
    "cbt":       ("PSYCH_MODEL_CBT",       "COLAB_URL_PSYLLM"),
    "crisis":    ("PSYCH_MODEL_CRISIS",    None),
    "screening": ("PSYCH_MODEL_SCREENING", "COLAB_URL_PSYCHOLEX"),
    "orion":     ("PSYCH_MODEL_ORION",     None),
    "dashboard": ("PSYCH_MODEL_DASHBOARD", "COLAB_URL_MENTALLAMA"),
}


@router.get("/warmup")
async def warmup_all():
    """Fire HF warmup for every page + probe every specialty worker."""
    hf_targets = [
        settings.PSYCH_MODEL_CHAT, settings.PSYCH_MODEL_JOURNAL, settings.PSYCH_MODEL_CBT,
        settings.PSYCH_MODEL_CRISIS, settings.PSYCH_MODEL_SCREENING,
        settings.PSYCH_MODEL_ORION, settings.PSYCH_MODEL_DASHBOARD,
    ]
    asyncio.create_task(_fire_and_forget_warmups(hf_targets))
    snapshot = await specialty_health_snapshot()
    return {"hf_warmup_scheduled": len(hf_targets), "specialty": snapshot}


@router.get("/warmup/{page}")
async def warmup_page(page: str):
    """
    Warm the layer-A classifier + probe the layer-B Colab worker for a single
    page. The frontend should hit this in onMount of that page.
    """
    cfg = _PAGE_MAP.get(page)
    if not cfg:
        return {"page": page, "scheduled": False, "reason": "unknown page"}
    hf_attr, specialty_attr = cfg
    hf_model = getattr(settings, hf_attr, "")
    asyncio.create_task(hf_warmup(hf_model))
    specialty_url = getattr(settings, specialty_attr, "") if specialty_attr else ""
    specialty_ok = None
    if specialty_url:
        from services.psych_specialty import health_check
        specialty_ok = await health_check(specialty_url)
    return {
        "page": page,
        "hf_model": hf_model,
        "hf_warmup_scheduled": True,
        "specialty_model": specialty_attr,
        "specialty_ready": specialty_ok,
    }


@router.get("/health")
async def psych_health():
    """Combined snapshot — useful in the settings page or a dev dashboard."""
    return {
        "augmentation_enabled": bool(settings.ENABLE_PSYCH_AUGMENT) and bool(settings.HF_API_KEY),
        "hf_models": {
            "chat":      settings.PSYCH_MODEL_CHAT,
            "journal":   settings.PSYCH_MODEL_JOURNAL,
            "cbt":       settings.PSYCH_MODEL_CBT,
            "crisis":    settings.PSYCH_MODEL_CRISIS,
            "screening": settings.PSYCH_MODEL_SCREENING,
            "orion":     settings.PSYCH_MODEL_ORION,
            "dashboard": settings.PSYCH_MODEL_DASHBOARD,
        },
        "specialty": await specialty_health_snapshot(),
    }


async def _fire_and_forget_warmups(models: list[str]) -> None:
    await asyncio.gather(*[hf_warmup(m) for m in models], return_exceptions=True)
