"""
Lightning AI Studio host for Lumina's psych specialty layer.

Runs in a Lightning AI Studio (free tier — 22 GPU-hours/month, T4 / L4).

What it does
------------
1. Spins up a FastAPI server with /infer and /health
2. Lazy-loads HF models on first request, keeps 1 in VRAM (T4 free tier
   has ~14 GB usable — only one 8B at a time in 4-bit). Evicts on next model.
3. Exposes a public URL via the Studio's port-share feature
4. POSTs the URL to Lumina backend's /internal/specialty/register on startup
   so the backend doesn't need a manual paste

How to use
----------
1. Open a new Studio at lightning.ai → Code → Python (GPU)
2. Make sure free tier picks a T4 / L4 GPU
3. Open the terminal:
     pip install -q fastapi uvicorn[standard] transformers accelerate \
                    bitsandbytes torch requests pyngrok
4. Copy this file in and set the env vars at top (or `export` them):
     LUMINA_BACKEND_URL       https://<your-deployed-backend>/   (NOT localhost)
     SPECIALTY_REGISTRY_SECRET <same secret as backend .env>
     PUBLIC_BASE_URL          https://...lightning.ai/...        (Studio's exposed URL)
5. Run:
     python lightning_psych_host.py
6. Studio "Share Port" panel → expose port 8000 → copy that public URL into
   PUBLIC_BASE_URL and restart, OR let pyngrok provision a fallback tunnel.

Free-tier model
---------------
Lightning Studio idles when you close the tab but the GPU keeps the model in
VRAM for ~minutes. Cold first request after idle = ~10-30 s. Acceptable for
fallback layer (calls are infrequent).

Models served
-------------
- psyllm        → GMLHUHE/PsyLLM-8B
- psychocounsel → Psychotherapy-LLM/PsychoCounsel-Llama3-8B
- mentallama    → klyang/MentaLLaMA-chat-7B-hf
- psycholex     → not publicly available, returns None
"""

from __future__ import annotations

import os
import gc
import sys
import time
import threading
from typing import Optional

import requests
import torch
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


# ─── Config (env-driven) ──────────────────────────────────────────────────────
LUMINA_BACKEND_URL = os.getenv("LUMINA_BACKEND_URL", "").rstrip("/")
SPECIALTY_SECRET   = os.getenv("SPECIALTY_REGISTRY_SECRET", "")
PUBLIC_BASE_URL    = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
PROVIDER_NAME      = os.getenv("SPECIALTY_PROVIDER", "lightning")
PORT               = int(os.getenv("PORT", "8000"))
HF_TOKEN           = os.getenv("HF_TOKEN", "")


MODEL_REGISTRY: dict[str, str] = {
    "psyllm":        "GMLHUHE/PsyLLM-8B",
    "psychocounsel": "Psychotherapy-LLM/PsyCoPref-Llama3-8B",
    "psycholex":     "aminabbasi/PsychoLexLLaMA-8B",  # gated — needs HF_TOKEN + accepted access
    "mentallama":    "klyang/MentaLLaMA-chat-7B-hf",
}


# ─── Lazy single-slot model cache (one model in VRAM at a time) ───────────────
_load_lock = threading.Lock()
_current: dict = {"key": None, "tok": None, "model": None}


def _bnb_4bit() -> BitsAndBytesConfig:
    return BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )


def _load(model_key: str):
    repo = MODEL_REGISTRY.get(model_key)
    if not repo:
        raise ValueError(f"unknown model_key {model_key!r}")

    with _load_lock:
        if _current["key"] == model_key and _current["model"] is not None:
            return _current["tok"], _current["model"]

        # Evict current
        if _current["model"] is not None:
            del _current["model"]
            _current["model"] = None
            gc.collect()
            torch.cuda.empty_cache()

        print(f"[load] {model_key} ← {repo}", flush=True)
        t0 = time.time()
        tok = AutoTokenizer.from_pretrained(repo, token=HF_TOKEN or None)
        if tok.pad_token_id is None:
            tok.pad_token = tok.eos_token
        model = AutoModelForCausalLM.from_pretrained(
            repo,
            token=HF_TOKEN or None,
            quantization_config=_bnb_4bit(),
            device_map="auto",
        )
        model.eval()
        _current.update(key=model_key, tok=tok, model=model)
        print(f"[load] {model_key} ready in {time.time() - t0:.1f}s", flush=True)
        return tok, model


# ─── FastAPI ──────────────────────────────────────────────────────────────────
app = FastAPI(title=f"Lumina specialty host ({PROVIDER_NAME})")


class InferBody(BaseModel):
    prompt: str
    max_new_tokens: int = 256
    temperature: float = 0.7
    model_key: Optional[str] = None


@app.post("/infer")
async def infer(body: InferBody, model: Optional[str] = None):
    # Resolution order: query ?model= → body.model_key → currently loaded
    model_key = model or body.model_key or _current.get("key") or "psyllm"
    if model_key not in MODEL_REGISTRY:
        return {"text": "", "model": None, "error": f"unknown model {model_key}"}

    tok, mdl = _load(model_key)
    inputs = tok(body.prompt, return_tensors="pt", truncation=True, max_length=4096).to(mdl.device)
    with torch.no_grad():
        out = mdl.generate(
            **inputs,
            max_new_tokens=int(body.max_new_tokens),
            temperature=float(max(0.01, body.temperature)),
            do_sample=body.temperature > 0.01,
            pad_token_id=tok.pad_token_id,
        )
    text = tok.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()
    return {"text": text, "model": MODEL_REGISTRY.get(model_key, "?")}


@app.get("/health")
def health():
    return {
        "ok":      True,
        "loaded":  _current.get("key"),
        "provider": PROVIDER_NAME,
        "available": list(MODEL_REGISTRY.keys()),
    }


class WarmBody(BaseModel):
    model_key: Optional[str] = None


@app.post("/warm")
async def warm(body: WarmBody, model: Optional[str] = None):
    """Kick off a background load for one model without blocking on it — lets
    the backend say 'start loading psycholex' the moment a user opens the
    screening test, so it's resident by the time they submit."""
    model_key = model or body.model_key or "psyllm"
    if model_key not in MODEL_REGISTRY:
        return {"scheduled": False, "error": f"unknown model {model_key}"}
    if _current.get("key") == model_key and _current.get("model") is not None:
        return {"scheduled": False, "already_loaded": True}

    def _bg():
        try:
            _load(model_key)
        except Exception as e:
            print(f"[warm] {model_key} FAILED {type(e).__name__}: {e}", flush=True)

    threading.Thread(target=_bg, daemon=True).start()
    return {"scheduled": True, "model_key": model_key}


# ─── Self-register every URL with Lumina backend on startup ───────────────────
def _self_register():
    if not (LUMINA_BACKEND_URL and SPECIALTY_SECRET and PUBLIC_BASE_URL):
        print("[register] skipped — set LUMINA_BACKEND_URL + "
              "SPECIALTY_REGISTRY_SECRET + PUBLIC_BASE_URL to enable", flush=True)
        return
    url = f"{LUMINA_BACKEND_URL}/internal/specialty/register"
    for model_key in MODEL_REGISTRY:
        try:
            r = requests.post(
                url,
                json={
                    "provider":  PROVIDER_NAME,
                    "model_key": model_key,
                    "url":       PUBLIC_BASE_URL,
                },
                headers={"X-Specialty-Secret": SPECIALTY_SECRET},
                timeout=10,
            )
            print(f"[register] {model_key} → {r.status_code} {r.text[:80]}", flush=True)
        except Exception as e:
            print(f"[register] {model_key} FAILED {type(e).__name__}: {e}", flush=True)


@app.on_event("startup")
def _on_startup():
    threading.Thread(target=_self_register, daemon=True).start()


# ─── Entrypoint ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if not torch.cuda.is_available():
        print("WARNING: no CUDA detected. Lightning Studio should provision a "
              "GPU — make sure the Studio is started with GPU enabled, not CPU.",
              file=sys.stderr)
    uvicorn.run(app, host="0.0.0.0", port=PORT)
