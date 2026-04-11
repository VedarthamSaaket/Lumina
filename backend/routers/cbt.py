# backend/routers/cbt.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Any
from models.database import get_db, User, CBTProgress
from utils.auth import get_current_user
import json

router = APIRouter(prefix="/api/cbt", tags=["cbt"])

MODULE_IDS = ["distortion", "reframing", "activation", "esteem", "exposure", "habit"]


class ProgressSave(BaseModel):
    responses: List[Any]  # accepts strings, ints, lists - any step response type


@router.get("/modules")
def get_modules(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    saved     = db.query(CBTProgress).filter(CBTProgress.user_id == user.id).all()
    saved_ids = {s.module_id for s in saved}
    return [{"id": m, "completed": m in saved_ids} for m in MODULE_IDS]


@router.post("/modules/{module_id}/progress")
def save_progress(
    module_id: str,
    data: ProgressSave,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),   # ← auth required
):
    if module_id not in MODULE_IDS:
        raise HTTPException(status_code=400, detail="Unknown module ID")

    # Serialise responses safely
    responses_json = json.dumps(data.responses)

    existing = (
        db.query(CBTProgress)
        .filter(CBTProgress.user_id == user.id, CBTProgress.module_id == module_id)
        .first()
    )
    if existing:
        existing.responses = responses_json
    else:
        progress = CBTProgress(
            user_id   = user.id,
            module_id = module_id,
            responses = responses_json,
        )
        db.add(progress)

    db.commit()
    return {"saved": True}


@router.get("/modules/{module_id}/progress")
def get_progress(
    module_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = (
        db.query(CBTProgress)
        .filter(CBTProgress.user_id == user.id, CBTProgress.module_id == module_id)
        .first()
    )
    if not record:
        return {"responses": [], "completed": False}
    return {
        "responses": json.loads(record.responses) if isinstance(record.responses, str) else record.responses,
        "completed": True,
    }
