import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
from routers import dashboard
from models.database import engine, run_migrations
from routers import auth, chat, journal, mood, screening, cbt, crisis, summary, cognitive, settings as settings_router, orion, stickers, psych_warmup, specialty_internal
from config import settings
from services.llm import warmup_model, close_http_client
from services.psych_hf import warmup_all_psych_models
from middleware.security import SecurityMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=== STARTUP DIAGNOSTIC ===")
    try:
        with engine.connect() as conn:
            current_user = conn.execute(text("SELECT current_user")).scalar()
            current_db   = conn.execute(text("SELECT current_database()")).scalar()
            print("CONNECTED USER:", current_user)
            print("CONNECTED DB:",   current_db)
    except Exception as e:
        print("CONNECTION ERROR:", str(e))
    try:
        run_migrations()
    except Exception as e:
        print("MIGRATION ERROR:", str(e))
    print("=== END DIAGNOSTIC ===")

    await warmup_model()
    # Fire-and-forget psych warmup so we don't block boot for 7 cold-starts
    # (HF free tier: each can take up to ~20s the first time). The classifiers
    # become ready in the background; calls during warmup just fail-soft.
    asyncio.create_task(warmup_all_psych_models())
    yield

    await close_http_client()


app = FastAPI(
    title="Lumina API",
    description="AI-Assisted Psychological Guidance Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    SecurityMiddleware,
    enforce_https=settings.ENFORCE_HTTPS,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(journal.router)
app.include_router(mood.router)
app.include_router(screening.router)
app.include_router(cbt.router)
app.include_router(crisis.router)
app.include_router(summary.router)
app.include_router(cognitive.router)
app.include_router(dashboard.router)
app.include_router(settings_router.router)
app.include_router(orion.router)
app.include_router(stickers.router)
app.include_router(psych_warmup.router)
app.include_router(specialty_internal.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Lumina API"}