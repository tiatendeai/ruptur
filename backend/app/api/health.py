from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter


router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, object]:
    return {
        "ok": True,
        "service": "ruptur-backend",
        "time_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }

