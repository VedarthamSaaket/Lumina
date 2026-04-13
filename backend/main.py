from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
from routers import dashboard
from models.database import engine, run_migrations
from routers import auth, chat, journal, mood, screening, cbt, crisis, summary, cognitive
from config import settings
from services.llm import warmup_model, close_http_client
from middleware.security import SecurityMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──
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
    yield

    # ── Shutdown ──
    await close_http_client()


app = FastAPI(
    title="Lumina API",
    description="AI-Assisted Psychological Guidance Backend",
    version="1.0.0",
    lifespan=lifespan,
    # Hide API docs in production – uncomment when deploying
    # docs_url=None,
    # redoc_url=None,
)

# ── 1. Security middleware (runs before everything) ───────────────────────────
#   Set enforce_https=True in production behind TLS termination proxy
app.add_middleware(
    SecurityMiddleware,
    enforce_https=settings.ENFORCE_HTTPS,
)

# ── 2. CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── 3. Routers ────────────────────────────────────────────────────────────────
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


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Lumina API"}
