import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://lumina_user:lumina_pass@localhost:5432/lumina_db"
    SECRET_KEY: str = "change-this-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3"
    FRONTEND_URL: str = "http://localhost:3000"
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")

    class Config:
        env_file = ".env"

settings = Settings()