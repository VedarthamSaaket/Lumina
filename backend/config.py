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

    class Config:
        env_file = ".env"


settings = Settings()

# ── Startup security checks ───────────────────────────────────────────────────
def _validate_secrets():
    issues = []

    if settings.SECRET_KEY in ("change-this-secret", "secret", "password", ""):
        issues.append(
            "SECRET_KEY is insecure. Set a strong random value in your .env file.\n"
            "  Generate one with:  python -c \"import secrets; print(secrets.token_hex(32))\""
        )

    if not settings.GROQ_API_KEY:
        issues.append(
            "GROQ_API_KEY is not set. Add it to your .env file:\n"
            "  GROQ_API_KEY=gsk_..."
        )

    if issues:
        print("\n" + "="*60)
        print("⚠️  SECURITY CONFIGURATION WARNINGS")
        print("="*60)
        for issue in issues:
            print(f"  • {issue}")
        print("="*60 + "\n")

_validate_secrets()
