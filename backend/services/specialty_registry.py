"""
Runtime URL registry for Layer-B specialty psych workers.

Workers (Lightning AI Studio, Kaggle notebooks, manual Colab) self-report their
public base URL to /internal/specialty-url on startup. The registry stores
{ model_key -> [ (provider, url), ... ] } ordered by provider priority.

resolve(model_key) walks the priority list and returns the first URL whose
provider has registered. Falls back to settings.COLAB_URL_* (manual paste) when
no live provider has reported.

Priority order (highest first):
    1. lightning   — Lightning AI Studio, persistent, fastest first response
    2. kaggle      — Kaggle notebook, overflow capacity
    3. colab       — manual Colab paste (legacy)
"""

from __future__ import annotations

import threading
import time
from typing import Optional

from config import settings


PRIORITY = ("lightning", "kaggle", "colab")
MODEL_KEYS = ("psyllm", "psychocounsel", "psycholex", "mentallama")

_lock = threading.Lock()
# { model_key: { provider: {"url": str, "ts": float} } }
_table: dict[str, dict[str, dict]] = {k: {} for k in MODEL_KEYS}


def register(provider: str, model_key: str, url: str) -> None:
    if provider not in PRIORITY:
        raise ValueError(f"unknown provider {provider!r}")
    if model_key not in MODEL_KEYS:
        raise ValueError(f"unknown model_key {model_key!r}")
    url = url.strip().rstrip("/")
    if not url.startswith("http"):
        raise ValueError("url must be http(s)")
    with _lock:
        _table[model_key][provider] = {"url": url, "ts": time.time()}


def unregister(provider: str, model_key: str) -> None:
    with _lock:
        _table.get(model_key, {}).pop(provider, None)


def _env_fallback(model_key: str) -> str:
    return {
        "psyllm":        settings.COLAB_URL_PSYLLM,
        "psychocounsel": settings.COLAB_URL_PSYCHOCOUNSEL,
        "psycholex":     settings.COLAB_URL_PSYCHOLEX,
        "mentallama":    settings.COLAB_URL_MENTALLAMA,
    }.get(model_key, "")


def resolve(model_key: str) -> Optional[str]:
    """Return best live URL for the model, else env fallback, else None."""
    with _lock:
        providers = _table.get(model_key, {})
        for p in PRIORITY:
            entry = providers.get(p)
            if entry and entry["url"]:
                return entry["url"]
    env = _env_fallback(model_key)
    return env or None


def snapshot() -> dict:
    """Read-only view for admin/health endpoints."""
    with _lock:
        return {
            k: {p: dict(v) for p, v in providers.items()}
            for k, providers in _table.items()
        }
