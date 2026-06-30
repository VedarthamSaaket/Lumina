"""
Kaggle notebook host for Lumina's psych specialty layer.

Runs in a Kaggle Notebook (free tier — 30 GPU-hours/week, dual T4 = 2 × 16 GB
VRAM). Wider VRAM than Lightning means we can keep MORE than one model resident.

Compared to lightning_psych_host.py
-----------------------------------
+ More VRAM → keep all three 8B models in 4-bit at once (~15 GB total)
+ More compute time/week (30h vs 22h/month for Lightning)
- No native public URL — uses cloudflared trycloudflare tunnel (free, rotates
  every notebook restart, which is fine because we self-report the new URL
  to the backend on every boot).

How to use
----------
1. Create new Kaggle notebook → Settings → Accelerator: GPU T4 x2
2. Add Internet access (Settings → toggle "Internet on")
3. Paste this whole file into ONE notebook cell
4. Set the secrets via Kaggle "Add-ons → Secrets":
       LUMINA_BACKEND_URL        https://<your-backend>/
       SPECIALTY_REGISTRY_SECRET <same secret as backend .env>
       HF_TOKEN                  hf_... (only if the model repos are gated)
5. Run All. The tunnel URL is auto-detected from cloudflared output and POSTed
   to Lumina backend's /internal/specialty/register endpoint.

After ~9 hours Kaggle kills the session. Just re-run. Backend's old URL will
be marked stale on next call (httpx times out → resolve falls through provider
priority list → eventually returns None → calling page degrades to Layer A).
"""

# ── Cell 1: install ──────────────────────────────────────────────────────────
# Uncomment in Kaggle cell:
# !pip install -q fastapi uvicorn transformers accelerate bitsandbytes nest_asyncio requests
# !wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
# !chmod +x /usr/local/bin/cloudflared

# ── Cell 2: host ─────────────────────────────────────────────────────────────
import os
import re
import sys
import time
import threading
import subprocess
from typing import Optional

import requests
import torch
import nest_asyncio
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


# Kaggle Secrets
try:
    from kaggle_secrets import UserSecretsClient
    _sec = UserSecretsClient()
    def _s(name: str, default: str = "") -> str:
        try:    return _sec.get_secret(name) or default
        except Exception: return os.getenv(name, default)
except Exception:
    def _s(name: str, default: str = "") -> str:
        return os.getenv(name, default)


LUMINA_BACKEND_URL = _s("LUMINA_BACKEND_URL").rstrip("/")
SPECIALTY_SECRET   = _s("SPECIALTY_REGISTRY_SECRET")
HF_TOKEN           = _s("HF_TOKEN")
PROVIDER_NAME      = os.getenv("SPECIALTY_PROVIDER", "kaggle")
PORT               = int(os.getenv("PORT", "8000"))
# Self-terminate after this many seconds without any /infer hit.
IDLE_SHUTDOWN_SEC  = int(_s("SPECIALTY_WORKER_IDLE_SECONDS", "1200"))


MODEL_REGISTRY: dict[str, str] = {
    "psyllm":        "GMLHUHE/PsyLLM-8B",
    "psychocounsel": "Psychotherapy-LLM/PsychoCounsel-Llama3-8B",
    "mentallama":    "klyang/MentaLLaMA-chat-7B-hf",
}


# ── Idle tracking ────────────────────────────────────────────────────────────
_boot_time = time.time()
_last_request_time = time.time()


# ── Multi-model resident cache (eager-load all on boot) ──────────────────────
_cache: dict[str, dict] = {}


def _bnb_4bit() -> BitsAndBytesConfig:
    return BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )


def _load_one(model_key: str):
    if model_key in _cache:
        return _cache[model_key]["tok"], _cache[model_key]["model"]
    repo = MODEL_REGISTRY[model_key]
    print(f"[load] {model_key} ← {repo}", flush=True)
    t0 = time.time()
    tok = AutoTokenizer.from_pretrained(repo, token=HF_TOKEN or None)
    if tok.pad_token_id is None:
        tok.pad_token = tok.eos_token
    mdl = AutoModelForCausalLM.from_pretrained(
        repo,
        token=HF_TOKEN or None,
        quantization_config=_bnb_4bit(),
        device_map="auto",
    )
    mdl.eval()
    _cache[model_key] = {"tok": tok, "model": mdl}
    print(f"[load] {model_key} ready in {time.time() - t0:.1f}s", flush=True)
    return tok, mdl


def _preload_all():
    for k in MODEL_REGISTRY:
        try:
            _load_one(k)
        except Exception as e:
            print(f"[preload] {k} FAILED {type(e).__name__}: {e}", flush=True)


# ── FastAPI ──────────────────────────────────────────────────────────────────
app = FastAPI(title=f"Lumina specialty host ({PROVIDER_NAME})")


class InferBody(BaseModel):
    prompt: str
    max_new_tokens: int = 256
    temperature: float = 0.7
    model_key: Optional[str] = None


@app.post("/infer")
async def infer(body: InferBody, model: Optional[str] = None):
    global _last_request_time
    _last_request_time = time.time()
    model_key = model or body.model_key or "psyllm"
    if model_key not in MODEL_REGISTRY:
        return {"text": "", "error": f"unknown model {model_key}"}
    tok, mdl = _load_one(model_key)
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
    return {"text": text, "model": MODEL_REGISTRY[model_key]}


@app.get("/health")
def health():
    return {
        "ok":        True,
        "provider":  PROVIDER_NAME,
        "loaded":    list(_cache.keys()),
        "available": list(MODEL_REGISTRY.keys()),
    }


# ── Cloudflared tunnel + URL detection ───────────────────────────────────────
_TUNNEL_RE = re.compile(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com")


def _spawn_tunnel(port: int) -> Optional[str]:
    p = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://localhost:{port}",
         "--no-autoupdate", "--metrics", "localhost:0"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1,
    )
    deadline = time.time() + 60
    while time.time() < deadline:
        line = p.stdout.readline()
        if not line:
            time.sleep(0.2)
            continue
        print("[cf]", line.rstrip(), flush=True)
        m = _TUNNEL_RE.search(line)
        if m:
            return m.group(0)
    return None


def _register(public_url: str):
    if not (LUMINA_BACKEND_URL and SPECIALTY_SECRET):
        print("[register] missing LUMINA_BACKEND_URL or secret — skipping", flush=True)
        return
    endpoint = f"{LUMINA_BACKEND_URL}/internal/specialty/register"
    for model_key in MODEL_REGISTRY:
        try:
            r = requests.post(
                endpoint,
                json={"provider": PROVIDER_NAME, "model_key": model_key, "url": public_url},
                headers={"X-Specialty-Secret": SPECIALTY_SECRET},
                timeout=10,
            )
            print(f"[register] {model_key} → {r.status_code}", flush=True)
        except Exception as e:
            print(f"[register] {model_key} FAILED {type(e).__name__}: {e}", flush=True)


def _bootstrap():
    # 1. preload models so first user request doesn't pay load latency
    _preload_all()
    # 2. spawn tunnel
    url = _spawn_tunnel(PORT)
    if not url:
        print("[bootstrap] tunnel URL not detected within timeout", flush=True)
        return
    print(f"[bootstrap] PUBLIC URL = {url}", flush=True)
    # 3. report
    _register(url)


def _report_shutdown_and_exit():
    """Notify backend so it can deduct uptime from the weekly quota counter
    and clear stale registry entries, then hard-exit so Kaggle releases the
    GPU and stops the quota meter."""
    uptime = max(0.0, time.time() - _boot_time)
    if LUMINA_BACKEND_URL and SPECIALTY_SECRET:
        try:
            requests.post(
                f"{LUMINA_BACKEND_URL}/internal/specialty/shutdown",
                json={"provider": PROVIDER_NAME, "uptime_seconds": uptime},
                headers={"X-Specialty-Secret": SPECIALTY_SECRET},
                timeout=10,
            )
        except Exception as e:
            print(f"[shutdown] notify failed {type(e).__name__}: {e}", flush=True)
    print(f"[shutdown] idle exit after {uptime:.0f}s uptime", flush=True)
    # Hard-exit the kernel — releases the GPU and stops quota meter.
    os._exit(0)


def _idle_watchdog():
    """Background loop. If no /infer in IDLE_SHUTDOWN_SEC, kill the kernel."""
    while True:
        time.sleep(30)
        if time.time() - _last_request_time > IDLE_SHUTDOWN_SEC:
            _report_shutdown_and_exit()


# ── Entrypoint ───────────────────────────────────────────────────────────────
if __name__ == "__main__" or "ipykernel" in sys.modules:
    if not torch.cuda.is_available():
        print("WARNING: no CUDA. Make sure Kaggle accelerator = GPU T4 x2.", file=sys.stderr)
    nest_asyncio.apply()
    threading.Thread(target=_bootstrap, daemon=True).start()
    threading.Thread(target=_idle_watchdog, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
