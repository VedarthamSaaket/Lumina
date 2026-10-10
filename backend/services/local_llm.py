import asyncio
import re
import shutil
import subprocess
import time
from pathlib import Path
from typing import Optional

import httpx

from config import settings
from services import emotion

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_LOG_PATH = _BACKEND_DIR / "local_llm.log"

_proc: Optional[subprocess.Popen] = None
_last_used = 0.0
_start_lock = asyncio.Lock()
_infer_lock = asyncio.Lock()
_watchdog: Optional[asyncio.Task] = None


def _binary() -> str:
    return settings.LLAMA_SERVER_BIN or shutil.which("llama-server") or ""


def _model_path() -> Path:
    path = Path(settings.LOCAL_LLM_MODEL_PATH)
    return path if path.is_absolute() else _BACKEND_DIR / path


def _base_url() -> str:
    return f"http://127.0.0.1:{settings.LOCAL_LLM_PORT}"


def available() -> bool:
    return bool(settings.LOCAL_LLM_ENABLED and _binary() and _model_path().is_file())


def running() -> bool:
    return _proc is not None and _proc.poll() is None


async def _healthy() -> bool:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{_base_url()}/health")
        return resp.status_code == 200
    except Exception:
        return False


async def _idle_watch() -> None:
    while running():
        await asyncio.sleep(20)
        idle = time.time() - _last_used
        if idle >= settings.LOCAL_LLM_IDLE_SECONDS and not _infer_lock.locked():
            stop()
            print(f"[local-llm] stopped after {int(idle)}s idle")
            return


async def ensure_running(timeout: float = 120.0) -> bool:
    global _proc, _last_used, _watchdog
    if not available():
        return False
    async with _start_lock:
        _last_used = time.time()
        if running() and await _healthy():
            return True
        if not running():
            log = open(_LOG_PATH, "w")
            _proc = subprocess.Popen(
                [
                    _binary(),
                    "-m", str(_model_path()),
                    "--host", "127.0.0.1",
                    "--port", str(settings.LOCAL_LLM_PORT),
                    "-c", str(settings.LOCAL_LLM_CONTEXT),
                    "-ngl", "99",
                    "--parallel", "1",
                ],
                stdout=log,
                stderr=subprocess.STDOUT,
            )
            print(f"[local-llm] starting {_model_path().name} on port {settings.LOCAL_LLM_PORT}")
        deadline = time.time() + timeout
        while time.time() < deadline:
            if not running():
                print("[local-llm] server exited during startup, see local_llm.log")
                return False
            if await _healthy():
                _last_used = time.time()
                if _watchdog is None or _watchdog.done():
                    _watchdog = asyncio.create_task(_idle_watch())
                return True
            await asyncio.sleep(0.5)
        return False


async def warm() -> dict:
    if not available():
        return {"available": False}
    if running():
        global _last_used
        _last_used = time.time()
        return {"available": True, "running": True}
    asyncio.create_task(ensure_running())
    return {"available": True, "running": False, "starting": True}


async def complete(
    messages: list[dict],
    max_tokens: int = 300,
    temperature: float = 0.3,
    timeout: float = 90.0,
    thinking: bool = False,
) -> Optional[str]:
    global _last_used
    if not await ensure_running():
        return None
    payload: dict = {
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "chat_template_kwargs": {"enable_thinking": thinking},
    }
    async with _infer_lock:
        _last_used = time.time()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(f"{_base_url()}/v1/chat/completions", json=payload)
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"].get("content") or ""
        except Exception as e:
            print(f"[local-llm] {type(e).__name__}: {e}")
            return None
        finally:
            _last_used = time.time()
    text = text.split("</think>")[-1]
    text = re.sub(r"</?content>", "", text)
    return text.strip() or None


def stop() -> None:
    global _proc
    emotion.unload()
    if _proc is None:
        return
    if _proc.poll() is None:
        _proc.terminate()
        try:
            _proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            _proc.kill()
    _proc = None


def status() -> dict:
    return {
        "available": available(),
        "running": running(),
        "model": _model_path().name,
        "idle_seconds": int(time.time() - _last_used) if running() else None,
    }
