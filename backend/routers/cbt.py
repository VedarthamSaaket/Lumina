# backend/routers/cbt.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Any
from models.database import get_db, User, CBTProgress
from utils.auth import get_current_user
from services import wellbeing
import json

router = APIRouter(prefix="/api/cbt", tags=["cbt"])

MODULE_IDS = ["distortion", "reframing", "activation", "esteem", "exposure", "habit", "values", "worrytime"]


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
async def save_progress(
    module_id: str,
    data: ProgressSave,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if module_id not in MODULE_IDS:
        raise HTTPException(status_code=400, detail="Unknown module ID")

    freetext = " ".join(str(r) for r in data.responses if isinstance(r, str) and r.strip())

    specialty_analysis = await wellbeing.cbt_analysis(freetext, module_id) if freetext else None

    responses_json = json.dumps({
        "responses": data.responses,
        "specialty_analysis": specialty_analysis,
    })

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
    wellbeing.schedule_cbt_review(user.id, module_id, freetext)
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
    raw = json.loads(record.responses) if isinstance(record.responses, str) else record.responses
    # Back-compat: older rows are a bare list; newer rows are a dict.
    if isinstance(raw, list):
        return {"responses": raw, "completed": True}
    return {
        "responses": raw.get("responses", []),
        "completed": True,
    }