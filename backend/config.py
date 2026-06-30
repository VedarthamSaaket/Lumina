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

    # ── Per-surface Groq model assignments (env-overridable) ─────────────────
    # All currently-live Groq models (2026-06). llama-3.3-70b-versatile,
    # kimi-k2-instruct-0905, and any date-suffixed legacy IDs have been
    # decommissioned and are intentionally avoided. The model fallback chain
    # in services.llm.generate_summary catches future decommissions silently.
    #
    # Lumina chat: warm conversational, proven 200 OK in logs
    MODEL_LUMINA_CHAT:       str = os.getenv("MODEL_LUMINA_CHAT",       "meta-llama/llama-4-scout-17b-16e-instruct")
    # Analytical synthesis (non-reasoning so message.content is never empty)
    MODEL_DASHBOARD_INSIGHT: str = os.getenv("MODEL_DASHBOARD_INSIGHT", "meta-llama/llama-4-scout-17b-16e-instruct")
    # Orion main chat
    MODEL_ORION_CHAT:        str = os.getenv("MODEL_ORION_CHAT",        "meta-llama/llama-4-scout-17b-16e-instruct")
    # Short reactive bursts during live games
    MODEL_ORION_LIVE_EVENT:  str = os.getenv("MODEL_ORION_LIVE_EVENT",  "meta-llama/llama-4-scout-17b-16e-instruct")
    # Post-game debrief — strict section format. Maverick is decommissioned;
    # Scout handles the format reliably.
    MODEL_ORION_DEBRIEF:     str = os.getenv("MODEL_ORION_DEBRIEF",     "meta-llama/llama-4-scout-17b-16e-instruct")
    # Creative structured right-panel content (cheap & fast)
    MODEL_ORION_RIGHT_PANEL: str = os.getenv("MODEL_ORION_RIGHT_PANEL", "llama-3.1-8b-instant")
    # Clinical screening summary
    MODEL_SUMMARY:           str = os.getenv("MODEL_SUMMARY",           "meta-llama/llama-4-scout-17b-16e-instruct")

    # ── HuggingFace Inference API (psychology augmentation layer) ────────────
    # Free user token from https://huggingface.co/settings/tokens
    HF_API_KEY: str = os.getenv("HF_API_KEY", "")

    # Master toggle. If False, every per-page psych call short-circuits to None
    # and the primary LLM proceeds unaugmented.
    ENABLE_PSYCH_AUGMENT: bool = os.getenv("ENABLE_PSYCH_AUGMENT", "true").lower() in ("1", "true", "yes")

    # Per-page psych model assignments. Each page gets its own specialized
    # classifier — no sharing — so a model decommission only takes one surface.
    PSYCH_MODEL_CHAT:      str = os.getenv("PSYCH_MODEL_CHAT",      "j-hartmann/emotion-english-distilroberta-base")
    PSYCH_MODEL_JOURNAL:   str = os.getenv("PSYCH_MODEL_JOURNAL",   "SamLowe/roberta-base-go_emotions")
    PSYCH_MODEL_CBT:       str = os.getenv("PSYCH_MODEL_CBT",       "mental/mental-bert-base-uncased")
    PSYCH_MODEL_CRISIS:    str = os.getenv("PSYCH_MODEL_CRISIS",    "sentinet/suicidality")
    PSYCH_MODEL_SCREENING: str = os.getenv("PSYCH_MODEL_SCREENING", "cardiffnlp/twitter-roberta-base-sentiment-latest")
    PSYCH_MODEL_ORION:     str = os.getenv("PSYCH_MODEL_ORION",     "cardiffnlp/twitter-roberta-base-emotion")
    PSYCH_MODEL_DASHBOARD: str = os.getenv("PSYCH_MODEL_DASHBOARD", "bhadresh-savani/distilbert-base-uncased-emotion")

    # ── Specialty psych LLMs (Layer B: 8B+ models hosted on Colab T4 + ngrok) ─
    # Each value is the public ngrok base URL printed by the matching notebook
    # under /colab/. Leave blank to disable that specialty — the page falls
    # back to the small HF classifier above.
    # CBT page → PsyLLM-8B (DSM-5/ICD-11 + CBT/ACT/psychodynamic frameworks)
    COLAB_URL_PSYLLM:        str = os.getenv("COLAB_URL_PSYLLM", "")
    # Chat page → PsychoCounsel-Llama3 (therapist decision-alignment critic)
    COLAB_URL_PSYCHOCOUNSEL: str = os.getenv("COLAB_URL_PSYCHOCOUNSEL", "")
    # Screening page → PsychoLexLLaMA-8B (academic psych terminology enrichment)
    COLAB_URL_PSYCHOLEX:     str = os.getenv("COLAB_URL_PSYCHOLEX", "")
    # Dashboard page → MentaLLaMA-7B (interpretable diagnostic justification)
    COLAB_URL_MENTALLAMA:    str = os.getenv("COLAB_URL_MENTALLAMA", "")
    # Master toggle for specialty layer
    ENABLE_SPECIALTY_PSYCH: bool = os.getenv("ENABLE_SPECIALTY_PSYCH", "true").lower() in ("1", "true", "yes")

    # ── Transactional email (Gmail SMTP) ──────────────────────────────────────
    # GMAIL_APP_PASSWORD is a 16-char app password (NOT the account password).
    # Both must live in backend/.env, which is gitignored.
    GMAIL_USER:         str = ""
    GMAIL_APP_PASSWORD: str = ""
    EMAIL_FROM_NAME:    str = "Lumina"
    # Minutes a verification / reset code stays valid
    EMAIL_CODE_TTL_MINUTES: int = 15

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Re-export individual constants for modules (e.g. email_service) that import them directly.
GMAIL_USER         = settings.GMAIL_USER
GMAIL_APP_PASSWORD = settings.GMAIL_APP_PASSWORD

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
