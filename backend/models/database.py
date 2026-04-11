# backend/models/database.py
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid
from config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generate_uuid():
    return str(uuid.uuid4())

def run_migrations():
    """Add new columns to existing tables if they are missing (safe to call repeatedly)."""
    from sqlalchemy import text
    new_columns = [
        ("users", "full_name", "VARCHAR"),
        ("users", "age",       "INTEGER"),
        ("users", "gender",    "VARCHAR"),
    ]
    with engine.connect() as conn:
        inspector = sa_inspect(engine)
        for table, col, col_type in new_columns:
            try:
                existing = [c["name"] for c in inspector.get_columns(table)]
                if col not in existing:
                    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {col} {col_type}'))
                    conn.commit()
                    print(f"[migrations] Added column '{col}' to '{table}'")
            except Exception:
                pass  # table may not exist yet - Base.metadata.create_all handles it

    # Create any new tables that don't exist yet
    Base.metadata.create_all(bind=engine)


class User(Base):
    __tablename__ = "users"
    id            = Column(String, primary_key=True, default=generate_uuid)
    email         = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    age_confirmed = Column(Boolean, default=False)
    theme         = Column(String, default="dark")
    created_at    = Column(DateTime, default=datetime.utcnow)
    full_name     = Column(String, nullable=True)
    age           = Column(Integer, nullable=True)
    gender        = Column(String, nullable=True)


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id         = Column(String, primary_key=True, default=generate_uuid)
    user_id    = Column(String, nullable=False, index=True)
    content    = Column(Text, nullable=False)
    mood_score = Column(Integer, nullable=True)
    tags       = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)


class MoodLog(Base):
    __tablename__ = "mood_logs"
    id         = Column(String, primary_key=True, default=generate_uuid)
    user_id    = Column(String, nullable=False, index=True)
    score      = Column(Integer, nullable=False)
    note       = Column(Text, nullable=True)
    tags       = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)


class ScreeningResult(Base):
    __tablename__ = "screening_results"
    id           = Column(String, primary_key=True, default=generate_uuid)
    user_id      = Column(String, nullable=False, index=True)
    type         = Column(String, nullable=False)
    answers      = Column(JSON, nullable=False)
    score        = Column(Integer, nullable=False)
    severity     = Column(String, nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow)
    question_contexts = Column(Text, nullable=True)


class CBTProgress(Base):
    __tablename__ = "cbt_progress"
    id         = Column(String, primary_key=True, default=generate_uuid)
    user_id    = Column(String, nullable=False, index=True)
    module_id  = Column(String, nullable=False)
    responses  = Column(JSON, default=list)
    saved_at   = Column(DateTime, default=datetime.utcnow)


class CrisisLog(Base):
    __tablename__ = "crisis_logs"
    id         = Column(String, primary_key=True, default=generate_uuid)
    user_id    = Column(String, nullable=True)
    level      = Column(Integer, nullable=False)
    content    = Column(Text, nullable=False)
    logged_at  = Column(DateTime, default=datetime.utcnow)


class CognitiveTestResult(Base):
    __tablename__ = "cognitive_test_results"
    id           = Column(String, primary_key=True, default=generate_uuid)
    user_id      = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    test_type    = Column(String, nullable=False)
    score_data   = Column(Text)
    raw_results  = Column(Text)
    completed_at = Column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"
    id         = Column(String, primary_key=True, default=generate_uuid)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title      = Column(String, nullable=False, default="New conversation")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id              = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    user_id         = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role            = Column(String, nullable=False)
    content         = Column(Text, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)


class InsightSummary(Base):
    __tablename__ = "insight_summaries"
    id         = Column(String, primary_key=True, default=generate_uuid)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title      = Column(String, nullable=False)
    content    = Column(Text, nullable=False)
    source     = Column(String, nullable=False, default="dashboard")  # "dashboard", "screening", "chat"
    created_at = Column(DateTime, default=datetime.utcnow)