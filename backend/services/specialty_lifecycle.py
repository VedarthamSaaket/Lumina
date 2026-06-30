"""
Wake-on-demand + quota tracking for the Kaggle-hosted specialty psych worker.

User flow this implements
-------------------------
1. User opens app, hits a feature that calls a specialty model.
2. _call_worker resolves registry → no live URL.
3. _call_worker fires `ensure_warm("psyllm")` as a background task and returns
   None (the calling page degrades to Layer A + Groq for THIS request).
4. ensure_warm calls Kaggle API → pushes a new kernel version → kernel boots
   (~3-5 min), loads models, self-registers URL via /internal/specialty/register.
5. Subsequent feature hits within the warm window get full specialty response.
6. Worker tracks idle time. After SPECIALTY_WORKER_IDLE_SECONDS of no /infer
   hits, it POSTs /internal/specialty/shutdown (uptime_seconds) and self-exits.
   Backend adds that uptime to the rolling weekly quota counter.
7. If quota_remaining_minutes() <= 0, ensure_warm refuses to wake the kernel
   until the rolling 7-day window slides forward enough.

Quota counter is a rolling 7-day window stored in SPECIALTY_QUOTA_FILE as
{"events": [[unix_ts, seconds_burned], ...]}. Events older than 7 days are
pruned on every read.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import threading
from pathlib import Path
from typing import Optional

from config import settings


# ─── Quota persistence ────────────────────────────────────────────────────────
_quota_lock = threading.Lock()
_WEEK_SEC = 7 * 24 * 3600


def _quota_path() -> Path:
    return Path(settings.SPECIALTY_QUOTA_FILE).resolve()


def _load_events() -> list[list]:
    p = _quota_path()
    if not p.exists():
        return []
    try:
        data = json.loads(p.read_text())
        evs = data.get("events", [])
        return [e for e in evs if isinstance(e, list) and len(e) == 2]
    except Exception:
        return []


def _save_events(events: list[list]) -> None:
    p = _quota_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({"events": events}, indent=2))


def _prune(events: list[list], now: float) -> list[list]:
    cutoff = now - _WEEK_SEC
    return [e for e in events if e[0] >= cutoff]


def record_uptime(seconds: float) -> None:
    if seconds <= 0:
        return
    with _quota_lock:
        now = time.time()
        events = _prune(_load_events(), now)
        events.append([now, float(seconds)])
        _save_events(events)


def burned_minutes_last_week() -> float:
    with _quota_lock:
        now = time.time()
        events = _prune(_load_events(), now)
        return sum(e[1] for e in events) / 60.0


def quota_remaining_minutes() -> float:
    return max(0.0, settings.SPECIALTY_WEEKLY_GPU_MINUTES - burned_minutes_last_week())


def quota_ok() -> bool:
    return quota_remaining_minutes() > 5  # reserve 5 min safety margin


# ─── Wake debouncing — only one in-flight push per kernel ─────────────────────
_wake_lock = threading.Lock()
_wake_state = {"in_flight_until": 0.0, "last_attempt": 0.0}
# How long after a wake we consider the kernel "still booting" — don't fire
# another wake during this window. ~6 min covers cold start.
_WAKE_GRACE_SEC = 6 * 60


def _wake_in_progress() -> bool:
    return time.time() < _wake_state["in_flight_until"]


# ─── Kaggle API ───────────────────────────────────────────────────────────────
def _ensure_kaggle_creds_on_disk() -> bool:
    """Write KAGGLE_USERNAME/KAGGLE_KEY into ~/.kaggle/kaggle.json so the
    `kaggle` package picks them up. Returns True on success."""
    if not (settings.KAGGLE_USERNAME and settings.KAGGLE_KEY):
        return False
    home = Path(os.path.expanduser("~"))
    kdir = home / ".kaggle"
    kdir.mkdir(exist_ok=True)
    kfile = kdir / "kaggle.json"
    payload = {"username": settings.KAGGLE_USERNAME, "key": settings.KAGGLE_KEY}
    kfile.write_text(json.dumps(payload))
    try:
        kfile.chmod(0o600)
    except Exception:
        pass
    return True


def _push_kernel_sync() -> tuple[bool, str]:
    if not _ensure_kaggle_creds_on_disk():
        return False, "missing Kaggle credentials"
    if not settings.KAGGLE_KERNEL_SLUG:
        return False, "KAGGLE_KERNEL_SLUG not configured"
    folder = settings.KAGGLE_KERNEL_DIR
    if not Path(folder).exists():
        return False, f"kernel folder not found: {folder}"
    try:
        # Late import — keeps the dependency optional.
        from kaggle.api.kaggle_api_extended import KaggleApi
        api = KaggleApi()
        api.authenticate()
        api.kernels_push_cli(folder)
        return True, "ok"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


async def ensure_warm(model_key: str) -> dict:
    """
    Best-effort wake of the Kaggle kernel. Returns a small status dict — never
    raises. Designed to be fired-and-forgotten by _call_worker so the user's
    request stays fast (kernel boot takes minutes; this just initiates it).
    """
    # Already alive? — registry resolves to a URL.
    from services import specialty_registry
    if specialty_registry.resolve(model_key):
        return {"action": "noop", "reason": "alive"}

    if _wake_in_progress():
        return {"action": "noop", "reason": "wake-in-flight"}

    if not quota_ok():
        return {
            "action": "refused",
            "reason": "weekly GPU quota exhausted",
            "remaining_min": quota_remaining_minutes(),
        }

    with _wake_lock:
        if _wake_in_progress():
            return {"action": "noop", "reason": "wake-in-flight"}
        _wake_state["in_flight_until"] = time.time() + _WAKE_GRACE_SEC
        _wake_state["last_attempt"] = time.time()

    ok, msg = await asyncio.get_event_loop().run_in_executor(None, _push_kernel_sync)
    if not ok:
        # Release the grace window so a subsequent request can retry sooner.
        with _wake_lock:
            _wake_state["in_flight_until"] = time.time() + 30
    return {"action": "wake", "ok": ok, "detail": msg}


# ─── Status snapshot (for /internal/specialty/snapshot + admin UI) ────────────
def lifecycle_snapshot() -> dict:
    return {
        "quota": {
            "weekly_budget_min": settings.SPECIALTY_WEEKLY_GPU_MINUTES,
            "burned_min":        round(burned_minutes_last_week(), 2),
            "remaining_min":     round(quota_remaining_minutes(), 2),
            "ok":                quota_ok(),
        },
        "wake": {
            "in_flight":   _wake_in_progress(),
            "last_attempt_ts": _wake_state["last_attempt"],
        },
    }
