from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.db import DatabaseNotConfiguredError, connect
from app.services.uazapi_ingest import ingest_uazapi_webhook, extract_message_fields
from app.clients.uazapi import UazapiClient
from app.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])


@router.post("/uazapi")
async def uazapi_webhook(request: Request) -> dict[str, Any]:
    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be a JSON object")

    try:
        fields = extract_message_fields(payload)
        from_me = fields.get("from_me")
        body = fields.get("body")
        chatid = fields.get("chatid")
        
        if not from_me and body and chatid:
            logger.info(f"Incoming message from {chatid}: {body}")
            if "5531981139540" in chatid:
                if settings.uazapi_base_url and settings.uazapi_token:
                    client = UazapiClient(base_url=settings.uazapi_base_url, token=settings.uazapi_token)
                    reply_text = f"*Jarvis:*\nRecebi sua mensagem: \"{body}\". O portal híbrido está online!"
                    client.send_text(number=chatid, text=reply_text)
                    logger.info(f"Auto-replied to {chatid} as Jarvis.")
    except Exception as e:
        logger.error(f"Error processing test logic: {e}")

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

