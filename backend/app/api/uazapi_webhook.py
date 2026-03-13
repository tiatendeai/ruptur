from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks

from app.db import DatabaseNotConfiguredError, connect
from app.services.uazapi_ingest import ingest_uazapi_webhook, extract_message_fields
from app.services.agent_service import agent_service
from app.clients.uazapi import UazapiClient
from app.clients.baileys import BaileysClient
from app.repositories import crm_repo
from app.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhook", tags=["webhook"])

def neutralize_br_number(number: str) -> str:
    """
    Remove o nono dígito de números brasileiros (especialmente DDD 31) 
    para contornar o bug de sincronização do WhatsApp Mobile.
    Ex: 5531989131980 -> 553189131980
    """
    digits = "".join(ch for ch in number if ch.isdigit())
    if digits.startswith("55") and len(digits) == 13 and digits[4] == "9":
        return digits[:4] + digits[5:]
    return digits

async def process_ai_response(payload: dict[str, Any], lead_id: str, conversation_id: str):
    """
    Background task to generate and send AI response.
    """
    try:
        with connect() as conn:
            lead = conn.execute("SELECT name, phone, source FROM leads WHERE id = %s", (lead_id,)).fetchone()
            if not lead:
                return
            
            lead_name, lead_phone, lead_source = lead
            
            # Puxar histórico recente
            history_rows = crm_repo.list_messages(conn, conversation_id=conversation_id, limit=10)
            history = []
            for m in reversed(history_rows):
                role = "assistant" if m.direction == "out" else "user"
                history.append({"role": role, "content": m.body or ""})

            last_msg = history[-1]["content"] if history else ""
            
            # Gerar resposta do Jarvis
            response_text = agent_service.get_jarvis_response(
                lead_name=lead_name or lead_phone or "Cliente",
                last_message=last_msg,
                history=history[:-1]
            )

            # Salvar no banco
            external_id = crm_repo.store_out_message(
                conn, 
                conversation_id=conversation_id, 
                text=response_text, 
                raw={"processed_by": "jarvis_ai"}
            )
            conn.commit()

            # Enviar via Provedor correto
            # Neutralizar o número para garantir o sync no celular
            clean_number = neutralize_br_number(lead_phone)
            
            is_baileys = "instance" in payload or "jid" in payload.get("data", {})
            
            if is_baileys and settings.baileys_base_url:
                client = BaileysClient(base_url=settings.baileys_base_url, instance_id=settings.baileys_instance_id)
                client.send_text(number=clean_number, text=response_text)
                logger.info(f"AI Response sent via Baileys to {clean_number}")
            elif settings.uazapi_base_url and settings.uazapi_token:
                client = UazapiClient(base_url=settings.uazapi_base_url, token=settings.uazapi_token)
                client.send_text(number=clean_number, text=response_text)
                logger.info(f"AI Response sent via UAZAPI to {clean_number}")

    except Exception as e:
        logger.error(f"Error in process_ai_response: {e}")


@router.post("/uazapi")
async def uazapi_webhook(request: Request, background_tasks: BackgroundTasks) -> dict[str, Any]:
    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be a JSON object")

    try:
        with connect() as conn:
            result = ingest_uazapi_webhook(conn, payload)
            conn.commit()
            
            if result.stored and result.lead_id and result.conversation_id:
                # Verificar se é uma mensagem de entrada (in) para disparar o agente
                fields = extract_message_fields(payload)
                if fields.get("from_me") is False:
                   background_tasks.add_task(process_ai_response, payload, result.lead_id, result.conversation_id)

            return {
                "ok": True,
                "stored": result.stored,
                "lead_id": result.lead_id,
                "conversation_id": result.conversation_id,
                "message_id": result.message_id,
            }
    except DatabaseNotConfiguredError:
        return {"ok": True, "stored": False, "reason": "database_not_configured"}

