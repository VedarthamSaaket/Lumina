# backend/routers/stickers.py
import re
from fastapi import APIRouter, HTTPException
import os
from pathlib import Path

router = APIRouter(prefix="/api/stickers", tags=["stickers"])

STICKERS_DIR = (Path(__file__).resolve().parent.parent / "frontend" / "public" / "stickers").resolve()
# If running outside Docker, look in the repo root
if not STICKERS_DIR.exists():
    STICKERS_DIR = (Path(__file__).resolve().parent.parent.parent / "frontend" / "public" / "stickers").resolve()

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"}

# Allowed pack name pattern — alphanumeric, underscore, hyphen, single dot, no path separators.
# Forward and back slashes, parent-dir tokens, NUL, leading dots etc. are all rejected.
_SAFE_PACK_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_\-]{0,63}$")

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


def _resolve_pack(pack_name: str) -> Path:
    """Strict pack-name validation + path-confinement check. Raises 404 on any
    attempt at traversal so attackers can't enumerate the filesystem layout."""
    if not pack_name or not _SAFE_PACK_RE.match(pack_name):
        raise HTTPException(status_code=404, detail="Pack not found")
    candidate = (STICKERS_DIR / pack_name).resolve()
    # Confinement: the resolved path MUST sit inside STICKERS_DIR.
    try:
        candidate.relative_to(STICKERS_DIR)
    except ValueError:
        raise HTTPException(status_code=404, detail="Pack not found")
    if not candidate.exists() or not candidate.is_dir():
        raise HTTPException(status_code=404, detail="Pack not found")
    return candidate


@router.get("/")
def list_packs():
    """List all available sticker packs with file counts."""
    if not STICKERS_DIR.exists():
        return {"packs": [], "stickers_dir": str(STICKERS_DIR)}
    packs = []
    for d in sorted(STICKERS_DIR.iterdir()):
        if d.is_dir() and _SAFE_PACK_RE.match(d.name):
            files = _index_pack(d)
            packs.append({"id": d.name, "label": d.name, "count": len(files)})
    return {"packs": packs}


@router.get("/{pack_name}")
def get_pack_files(pack_name: str):
    """Return a list of relative image file paths for a sticker pack."""
    if not STICKERS_DIR.exists():
        raise HTTPException(status_code=404, detail="Stickers directory not found")

    pack_dir = _resolve_pack(pack_name)

    if pack_name not in _pack_cache:
        _pack_cache[pack_name] = _index_pack(pack_dir)

    return _pack_cache[pack_name]
