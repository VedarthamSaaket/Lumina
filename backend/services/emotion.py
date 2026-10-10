import asyncio
import threading
from typing import Optional

MODEL_ID = "j-hartmann/emotion-english-distilroberta-base"

_pipeline = None
_lock = threading.Lock()
_unavailable = False


def _load():
    global _pipeline, _unavailable
    if _pipeline is not None or _unavailable:
        return _pipeline
    with _lock:
        if _pipeline is not None or _unavailable:
            return _pipeline
        try:
            import torch
            from transformers import pipeline

            device = "mps" if torch.backends.mps.is_available() else -1
            _pipeline = pipeline("text-classification", model=MODEL_ID, top_k=None, device=device)
            print(f"[emotion] loaded {MODEL_ID}")
        except Exception as e:
            _unavailable = True
            print(f"[emotion] classifier unavailable ({type(e).__name__}), continuing without it")
    return _pipeline


def _classify(texts: list[str]) -> Optional[list[str]]:
    clf = _load()
    if clf is None:
        return None
    readings = []
    for scores in clf([t[:800] for t in texts], truncation=True):
        top = sorted(scores, key=lambda d: -d["score"])[:3]
        readings.append(", ".join(f"{d['label']} {d['score']:.2f}" for d in top if d["score"] >= 0.08))
    return readings


async def readings(texts: list[str]) -> Optional[list[str]]:
    if not texts:
        return None
    try:
        return await asyncio.to_thread(_classify, texts)
    except Exception as e:
        print(f"[emotion] {type(e).__name__}: {e}")
        return None


def unload() -> None:
    global _pipeline
    with _lock:
        _pipeline = None
