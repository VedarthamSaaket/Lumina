# backend/routers/stickers.py
from fastapi import APIRouter, HTTPException
import os
from pathlib import Path

router = APIRouter(prefix="/api/stickers", tags=["stickers"])

STICKERS_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "stickers"
# If running outside Docker, look in the repo root
if not STICKERS_DIR.exists():
    STICKERS_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "stickers"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"}

_pack_cache: dict[str, list[str]] = {}


def _index_pack(pack_dir: Path) -> list[str]:
    """Recursively find all image files in a pack directory, returning relative paths."""
    files = []
    for root, _dirs, filenames in os.walk(pack_dir):
        root_path = Path(root)
        for fname in sorted(filenames):
            if Path(fname).suffix.lower() in IMAGE_EXTS:
                rel = str(root_path.relative_to(pack_dir) / fname)
                # Normalise to forward slashes
                rel = rel.replace("\\", "/")
                files.append(rel)
    return files


@router.get("/")
def list_packs():
    """List all available sticker packs with file counts."""
    if not STICKERS_DIR.exists():
        return {"packs": [], "stickers_dir": str(STICKERS_DIR)}
    packs = []
    for d in sorted(STICKERS_DIR.iterdir()):
        if d.is_dir():
            files = _index_pack(d)
            packs.append({"id": d.name, "label": d.name, "count": len(files)})
    return {"packs": packs}


@router.get("/{pack_name:path}")
def get_pack_files(pack_name: str):
    """Return a list of relative image file paths for a sticker pack."""
    if not STICKERS_DIR.exists():
        raise HTTPException(status_code=404, detail="Stickers directory not found")

    pack_dir = STICKERS_DIR / pack_name
    if not pack_dir.exists() or not pack_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"Pack '{pack_name}' not found")

    if pack_name not in _pack_cache:
        _pack_cache[pack_name] = _index_pack(pack_dir)

    return _pack_cache[pack_name]
