from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.db import DatabaseNotConfiguredError, connect
from app.services.uazapi_ingest import ingest_uazapi_webhook


router = APIRouter(prefix="/webhook", tags=["webhook"])


@router.post("/uazapi")
async def uazapi_webhook(request: Request) -> dict[str, Any]:
    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be a JSON object")

    try:
        with connect() as conn:
            result = ingest_uazapi_webhook(conn, payload)
            conn.commit()
            return {
                "ok": True,
                "stored": result.stored,
                "lead_id": result.lead_id,
                "conversation_id": result.conversation_id,
                "message_id": result.message_id,
            }
    except DatabaseNotConfiguredError:
        return {"ok": True, "stored": False, "reason": "database_not_configured"}

