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

    # Shared secret workers (Lightning / Kaggle / Colab) send in X-Specialty-Secret
    # when self-reporting their public URL to /internal/specialty/register.
    SPECIALTY_REGISTRY_SECRET: str = os.getenv("SPECIALTY_REGISTRY_SECRET", "")

    # Kaggle API credentials — used by services/specialty_lifecycle to wake
    # the kernel when the registry has no live worker and a user feature fires.
    KAGGLE_USERNAME:     str = os.getenv("KAGGLE_USERNAME", "")
    KAGGLE_KEY:          str = os.getenv("KAGGLE_KEY", "")
    # Slug of the Kaggle notebook that runs kaggle_psych_host.py
    # e.g. "vaedarth/lumina-psych-host"
    KAGGLE_KERNEL_SLUG:  str = os.getenv("KAGGLE_KERNEL_SLUG", "")
    # Local folder containing kernel-metadata.json + the host script (used to
    # push a new version when waking). Defaults to repo-relative path.
    KAGGLE_KERNEL_DIR:   str = os.getenv("KAGGLE_KERNEL_DIR", "../kaggle-kernel")

    # Weekly GPU budget for the Kaggle free tier (30 hours = 1800 minutes).
    # The lifecycle controller refuses to issue wake calls once this much
    # uptime has been reported by workers in the current rolling 7-day window.
    SPECIALTY_WEEKLY_GPU_MINUTES: int = int(os.getenv("SPECIALTY_WEEKLY_GPU_MINUTES", "1800"))
    # Persisted quota state file
    SPECIALTY_QUOTA_FILE: str = os.getenv("SPECIALTY_QUOTA_FILE", "./specialty_quota.json")
    # How long worker can sit idle (no /infer hits) before self-terminating
    SPECIALTY_WORKER_IDLE_SECONDS: int = int(os.getenv("SPECIALTY_WORKER_IDLE_SECONDS", "1200"))

    # ── Transactional email (Brevo API primary, Gmail SMTP fallback) ─────────
    # Brevo (formerly Sendinblue) HTTP API — preferred since it works on hosts
    # that block outbound SMTP and carries a higher free-tier quota than Gmail.
    # BREVO_FROM_EMAIL must be a sender verified in the Brevo dashboard.
    # email_service falls back to Gmail SMTP below when BREVO_API_KEY is unset.
    BREVO_API_KEY:      str = ""
    BREVO_FROM_EMAIL:   str = ""
    BREVO_FROM_NAME:    str = "Lumina"

    # GMAIL_APP_PASSWORD is a 16-char app password (NOT the account password).
    # All email settings live in backend/.env, which is gitignored.
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

    # Specialty registry secret — only needed if the layer is enabled, but if
    # workers are reporting in we must require a strong secret in production.
    if is_prod and settings.ENABLE_SPECIALTY_PSYCH and settings.SPECIALTY_REGISTRY_SECRET in INSECURE_SECRETS:
        fatal.append(
            "SPECIALTY_REGISTRY_SECRET is unset in production while specialty psych "
            "layer is enabled. Set a strong random value in your .env."
        )

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
