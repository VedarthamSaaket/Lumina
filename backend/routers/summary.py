# backend/routers/summary.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.llm import generate_summary
import json

router = APIRouter()

class SummaryRequest(BaseModel):
    prompt: str

@router.post("/api/summary")
async def get_summary(body: SummaryRequest):
    """Non-streaming summary - used by screening page."""
    summary = await generate_summary(body.prompt)
    return {"summary": summary}

@router.post("/api/summary/stream")
async def stream_summary(body: SummaryRequest):
    """Streaming summary - streams tokens as they arrive."""
    async def generate():
        from groq import Groq
        from config import settings
        client = Groq(api_key=settings.GROQ_API_KEY)
        try:
            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": body.prompt}],
                max_tokens=600,
                temperature=0.75,
                stream=True,
            )
            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    yield f"data: {json.dumps({'text': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            print(f"[Groq summary stream error] {type(e).__name__}: {e}")
            yield f"data: {json.dumps({'text': 'Unable to generate summary right now.'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )