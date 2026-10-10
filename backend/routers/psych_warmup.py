from fastapi import APIRouter

from services import local_llm

router = APIRouter(prefix="/api/psych", tags=["psych"])

_SUPERVISED_PAGES = {"chat", "cbt"}


@router.get("/warmup")
async def warmup_all():
    return {"supervisor": local_llm.status()}


@router.get("/warmup/{page}")
async def warmup_page(page: str):
    supervisor = await local_llm.warm() if page in _SUPERVISED_PAGES else None
    return {"page": page, "supervisor": supervisor}


@router.get("/health")
async def psych_health():
    return {"supervisor": local_llm.status()}
