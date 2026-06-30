"""
Internal endpoint workers ping on startup to self-report their public URL.

Auth: shared secret in X-Specialty-Secret header. Set SPECIALTY_REGISTRY_SECRET
in backend/.env and pass the same value from the Lightning/Kaggle worker code.

Endpoints
---------
POST /internal/specialty/register
    body: { provider: "lightning"|"kaggle"|"colab",
            model_key: "psyllm"|"psychocounsel"|"psycholex"|"mentallama",
            url: "https://..." }

POST /internal/specialty/unregister
    body: { provider, model_key }

GET  /internal/specialty/snapshot
    returns the in-memory registry table (also auth-gated)
"""

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from config import settings
from services import specialty_registry, specialty_lifecycle

router = APIRouter(prefix="/internal/specialty", tags=["specialty-internal"])


class RegisterBody(BaseModel):
    provider:  str = Field(..., pattern=r"^(lightning|kaggle|colab)$")
    model_key: str = Field(..., pattern=r"^(psyllm|psychocounsel|psycholex|mentallama)$")
    url:       str


class UnregisterBody(BaseModel):
    provider:  str
    model_key: str


class ShutdownBody(BaseModel):
    provider:        str
    uptime_seconds:  float


def _check(secret_header: str | None) -> None:
    expected = settings.SPECIALTY_REGISTRY_SECRET
    if not expected:
        raise HTTPException(503, "registry secret not configured")
    if not secret_header or secret_header != expected:
        raise HTTPException(401, "bad secret")


@router.post("/register")
def register(body: RegisterBody, x_specialty_secret: str | None = Header(default=None)):
    _check(x_specialty_secret)
    try:
        specialty_registry.register(body.provider, body.model_key, body.url)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"ok": True, "provider": body.provider, "model_key": body.model_key}


@router.post("/unregister")
def unregister(body: UnregisterBody, x_specialty_secret: str | None = Header(default=None)):
    _check(x_specialty_secret)
    specialty_registry.unregister(body.provider, body.model_key)
    return {"ok": True}


@router.post("/shutdown")
def shutdown(body: ShutdownBody, x_specialty_secret: str | None = Header(default=None)):
    """Worker calls this immediately before self-exiting on idle. We record
    the uptime against the rolling weekly quota and clear the registry entries
    for that provider so the next user feature triggers a fresh wake."""
    _check(x_specialty_secret)
    specialty_lifecycle.record_uptime(body.uptime_seconds)
    for model_key in specialty_registry.MODEL_KEYS:
        specialty_registry.unregister(body.provider, model_key)
    return {"ok": True, "burned_min_total": specialty_lifecycle.burned_minutes_last_week()}


@router.get("/snapshot")
def snapshot(x_specialty_secret: str | None = Header(default=None)):
    _check(x_specialty_secret)
    return {
        "registry":  specialty_registry.snapshot(),
        "lifecycle": specialty_lifecycle.lifecycle_snapshot(),
    }
