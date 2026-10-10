import os
import sys
import logging
from pydantic_settings import BaseSettings

logger = logging.getLogger("lumina.config")


class Settings(BaseSettings):
    DATABASE_URL:  str = "postgresql://lumina_user:lumina_pass@localhost:5432/lumina_db"
    SECRET_KEY:    str = "change-this-secret"
    ALGORITHM:     str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080   # 7 days

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL:    str = "llama3"

    FRONTEND_URL: str = "http://localhost:3000"

    # Set to "true" in production behind TLS proxy
    ENFORCE_HTTPS: bool = False

    # Groq key must come from the environment, NEVER hard-coded
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    MODEL_LUMINA_CHAT:       str = os.getenv("MODEL_LUMINA_CHAT",       "qwen/qwen3.8-27b")
    MODEL_DASHBOARD_INSIGHT: str = os.getenv("MODEL_DASHBOARD_INSIGHT", "openai/gpt-oss-120b")
    MODEL_ORION_CHAT:        str = os.getenv("MODEL_ORION_CHAT",        "qwen/qwen3.8-27b")
    MODEL_ORION_LIVE_EVENT:  str = os.getenv("MODEL_ORION_LIVE_EVENT",  "qwen/qwen3.8-27b")
    MODEL_ORION_DEBRIEF:     str = os.getenv("MODEL_ORION_DEBRIEF",     "qwen/qwen3.8-27b")
    MODEL_ORION_RIGHT_PANEL: str = os.getenv("MODEL_ORION_RIGHT_PANEL", "qwen/qwen3.8-27b")
    MODEL_SUMMARY:           str = os.getenv("MODEL_SUMMARY",           "openai/gpt-oss-120b")
    MODEL_FALLBACK:          str = os.getenv("MODEL_FALLBACK",          "openai/gpt-oss-20b")

    MODEL_RISK:              str = os.getenv("MODEL_RISK",              "openai/gpt-oss-safeguard-20b")

    LOCAL_LLM_ENABLED:      bool = os.getenv("LOCAL_LLM_ENABLED", "true").lower() in ("1", "true", "yes")
    LLAMA_SERVER_BIN:       str = os.getenv("LLAMA_SERVER_BIN", "")
    LOCAL_LLM_MODEL_PATH:   str = os.getenv("LOCAL_LLM_MODEL_PATH", "./models/llm/psyllm-8b.Q4_K_M.gguf")
    LOCAL_LLM_PORT:         int = int(os.getenv("LOCAL_LLM_PORT", "8091"))
    LOCAL_LLM_IDLE_SECONDS: int = int(os.getenv("LOCAL_LLM_IDLE_SECONDS", "300"))
    LOCAL_LLM_CONTEXT:      int = int(os.getenv("LOCAL_LLM_CONTEXT", "4096"))

    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# ── Startup security checks ───────────────────────────────────────────────────
INSECURE_SECRETS = {"change-this-secret", "change-me-in-production", "secret", "password", ""}


def _validate_secrets():
    """Warn on insecure secrets in dev; refuse to boot in production.
    Production is detected via ENFORCE_HTTPS=true OR ENVIRONMENT in {prod, production}."""
    issues: list[str] = []
    fatal: list[str] = []

    is_prod = (
        settings.ENFORCE_HTTPS
        or os.getenv("ENVIRONMENT", "").lower() in ("prod", "production")
    )

    if settings.SECRET_KEY in INSECURE_SECRETS or len(settings.SECRET_KEY) < 32:
        msg = (
            "SECRET_KEY is insecure. Set a strong random value (≥32 chars) in your .env.\n"
            "  Generate one with:  python -c \"import secrets; print(secrets.token_hex(32))\""
        )
        (fatal if is_prod else issues).append(msg)

    if not settings.GROQ_API_KEY:
        msg = "GROQ_API_KEY is not set. Add it to your .env file:\n  GROQ_API_KEY=gsk_..."
        (fatal if is_prod else issues).append(msg)

    if issues:
        print("\n" + "="*60)
        print("⚠️  SECURITY CONFIGURATION WARNINGS")
        print("="*60)
        for issue in issues:
            print(f"  • {issue}")
        print("="*60 + "\n")

    if fatal:
        print("\n" + "="*60)
        print("⛔  REFUSING TO BOOT — FATAL SECURITY MISCONFIGURATION")
        print("="*60)
        for f in fatal:
            print(f"  • {f}")
        print("="*60 + "\n")
        sys.exit(2)

_validate_secrets()
