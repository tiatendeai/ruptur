from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.db import connect
from app.repositories import crm_repo
from app.clients.uazapi import UazapiError
from app.services.agent_service import agent_service
from app.services.media_service import media_service
from app.services.uazapi_ingest import extract_message_fields, ingest_uazapi_webhook
from app.settings import settings
from app.uazapi_runtime import client as build_uazapi_client, resolve_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhook", tags=["webhook"])

# Canonical BR numbers (current format with 9 digit for mobile).
CANONICAL_BUSINESS_NUMBERS = {"5531981139540", "5531989131980"}
BUSINESS_CANONICAL_BY_LEGACY = {
    "553181139540": "5531981139540",
    "553189131980": "5531989131980",
}
# RUP-2026-012: temporary compatibility while older auth folders are still in use.
INSTANCE_BY_CANONICAL_PHONE = {
    "5531981139540": "inst-553181139540",
    "5531989131980": "inst-553189131980",
}
IAZINHA_COMMANDS = {"iazinha", "/iazinha", "/start-iazinha", "assistant", "/assistant", "/start-assistant", "/start-assistente"}
JARVIS_COMMANDS = {"jarvis", "/jarvis", "/start-jarvis"}
STATUS_COMMANDS = {"/session-status"}
END_COMMANDS = {"/end-session", "/stop", "/stop-agent", "/agent-stop", "/stop-iazinha", "/stop-jarvis"}
RESET_COMMANDS = {"#reset-session"}
SESSION_TIMEOUT_SECONDS = 1800


JARVIS_PASSWORD = "7"


def digits_only(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def local_part(value: str | None) -> str:
    return str(value or "").split("@", 1)[0].split(":", 1)[0]


def normalize_target_digits(value: str | None) -> str:
    digits = digits_only(local_part(value))
    if digits.startswith("55") and len(digits) == 12 and digits[4] in {"6", "7", "8", "9"}:
        return f"{digits[:4]}9{digits[4:]}"
    return digits


def canonical_jid(value: str | None) -> str | None:
    digits = normalize_target_digits(value)
    if not digits:
        return None
    return f"{digits}@s.whatsapp.net"


def parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    normalized = str(value).strip().lower()
    return normalized in {"1", "true", "yes", "on", "sim"}


def _payload_data(payload: dict[str, Any]) -> dict[str, Any]:
    return payload.get("data", {}) if isinstance(payload.get("data"), dict) else {}


def _message_data(payload: dict[str, Any]) -> dict[str, Any]:
    fields = extract_message_fields(payload)
    data = fields.get("data")
    return data if isinstance(data, dict) else {}


def is_jarvis_activation_attempt(value: str | None) -> bool:
    normalized = normalize_command(value)
    return normalized in JARVIS_COMMANDS or normalized in {"/jarvis-7", "jarvis 7", "/jarvis 7", "jarvis-7"}


def is_iazinha_activation_attempt(value: str | None) -> bool:
    normalized = normalize_command(value)
    if normalized in IAZINHA_COMMANDS:
        return True
    return (
        normalized.startswith("iazinha ")
        or normalized.startswith("/iazinha ")
        or normalized.startswith("assistant ")
        or normalized.startswith("/assistant ")
        or normalized.startswith("/start-iazinha")
        or normalized.startswith("/start-assistant")
        or normalized.startswith("/start-assistente")
    )


def has_jarvis_password(value: str | None) -> bool:
    normalized = normalize_command(value)
    return normalized in {"7", "/7", "jarvis 7", "/jarvis 7", "jarvis-7", "/jarvis-7"}


def normalize_target(value: str | None) -> str:
    return normalize_target_digits(value)


def canonical_business_phone(value: str | None) -> str:
    normalized = normalize_target(value)
    if not normalized:
        return ""
    return BUSINESS_CANONICAL_BY_LEGACY.get(normalized, normalized)


def normalize_command(value: str | None) -> str:
    cleaned = (value or "").strip().lower()
    while cleaned.endswith((".", ",", "!", "?", ":", ";")):
        cleaned = cleaned[:-1].strip()
    return cleaned


def direct_user_jid(value: str | None) -> str | None:
    raw = str(value or "").strip()
    if not raw or raw == "status@broadcast" or "@g.us" in raw:
        return None
    if "@" in raw:
        domain = raw.split("@", 1)[1].lower()
        if domain in {"lid", "newsletter", "broadcast"}:
            return None
        if domain not in {"s.whatsapp.net", "c.us"}:
            return None
    phone = digits_only(local_part(raw))
    if not phone:
        return None
    return f"{phone}@s.whatsapp.net"


def is_self_chat(payload: dict[str, Any], chatid: str) -> bool:
    data = _payload_data(payload)
    message_data = _message_data(payload)
    me_jid = payload.get("meJid") or data.get("meJid") or message_data.get("meJid") or ""
    sender = str(message_data.get("wa_sender") or message_data.get("sender") or data.get("wa_sender") or data.get("sender") or "")
    from_me = message_data.get("fromMe")
    if from_me is None:
        from_me = message_data.get("isFromMe")
    if from_me is None:
        from_me = data.get("fromMe")
    if from_me is None:
        from_me = data.get("isFromMe")
    if bool(normalize_target(chatid) and normalize_target(chatid) == normalize_target(me_jid)):
        return True
    # WhatsApp desktop/self threads can arrive as @lid chats instead of the phone JID.
    if chatid.endswith("@lid") and parse_bool(from_me):
        me_phone = normalize_target(me_jid)
        sender_phone = normalize_target(sender)
        sender_is_self = bool(sender_phone and sender_phone == me_phone)
        sender_is_lid = bool(sender and sender.endswith("@lid"))
        if sender == chatid or sender_is_self or sender_is_lid or not sender:
            return True
    return False


def is_assistant_output_message(body: str | None) -> bool:
    normalized = (body or "").strip().lower()
    return normalized.startswith("*iazinha:*") or normalized.startswith("*jarvis:*")


def is_group_chat(chatid: str) -> bool:
    return "@g.us" in chatid or chatid == "status@broadcast"


def wants_audio_response(body: str | None) -> bool:
    normalized = normalize_command(body)
    triggers = ("audio", "áudio", "em audio", "em áudio", "me responda em audio", "me responda em áudio", "mande audio", "mande áudio", "responda em audio", "responda em áudio", "voz")
    return any(token in normalized for token in triggers)


def apply_persona_prefix(persona: str, text: str | None) -> str:
    normalized = (text or "").strip()
    if not normalized:
        normalized = "Desculpe, nao consegui montar uma resposta agora."
    low = normalized.lower()
    if low.startswith("*iazinha:*") or low.startswith("*jarvis:*"):
        return normalized
    prefix = "*Jarvis:*" if persona == "jarvis" else "*IAzinha:*"
    return f"{prefix} {normalized}"


def ensure_session_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    base = dict(metadata or {})
    base.setdefault("session_status", "idle")
    base.setdefault("active_persona", "iazinha")
    base.setdefault("response_mode", "text")
    base.setdefault("warmup_mode", False)
    base.setdefault("jarvis_pending", False)
    return base


def is_managed_cross_chat(payload: dict[str, Any], fields: dict[str, Any], metadata: dict[str, Any]) -> bool:
    data = _payload_data(payload)
    message_data = _message_data(payload)
    owner = canonical_business_phone(payload.get("meJid") or data.get("meJid") or message_data.get("meJid") or "")
    sender = canonical_business_phone(fields.get("sender") or fields.get("chatid") or "")
    if metadata.get("warmup_mode") is True:
        return False
    return bool(
        owner
        and sender
        and owner in CANONICAL_BUSINESS_NUMBERS
        and sender in CANONICAL_BUSINESS_NUMBERS
        and owner != sender
    )


def resolve_uazapi_instance_id(payload: dict[str, Any]) -> str:
    data = _payload_data(payload)
    message_data = _message_data(payload)
    explicit = str(payload.get("instance") or data.get("instance") or message_data.get("instance") or "").strip()
    return explicit


def resolve_target_jid(payload: dict[str, Any], lead_phone: str | None = None) -> str:
    data = _payload_data(payload)
    message_data = _message_data(payload)
    raw_chatid = str(message_data.get("wa_chatid") or message_data.get("chatid") or data.get("wa_chatid") or data.get("chatid") or "").strip()
    me_jid = str(payload.get("meJid") or data.get("meJid") or message_data.get("meJid") or "").strip()

    # RUP-2026-015: when WhatsApp already gives us a direct user JID/phone,
    # reply in that exact thread instead of force-inserting the BR 9th digit.
    for candidate in (raw_chatid, me_jid):
        direct = direct_user_jid(candidate)
        if direct:
            return direct

    # Lead phone remains a fallback when the transport only exposes @lid.
    direct = direct_user_jid(lead_phone)
    if direct:
        return direct

    if lead_phone:
        fallback = canonical_jid(lead_phone)
        if fallback:
            return fallback
    return raw_chatid


def format_session_status(metadata: dict[str, Any], *, self_chat: bool) -> str:
    auth = "self" if self_chat else ("ok" if metadata.get("session_status") == "active" else "pending")
    return (
        "*IAzinha:* Status da sessao\n"
        f"- status: {metadata.get('session_status', 'idle')}\n"
        f"- persona: {metadata.get('active_persona', 'iazinha')}\n"
        f"- modo: {metadata.get('response_mode', 'text')}\n"
        f"- auth: {auth}"
    )


def send_assistant_response_via_uazapi(
    payload: dict[str, Any],
    *,
    target_jid: str,
    response_text: str,
    audio_data: bytes | None,
) -> tuple[str, dict[str, Any]]:
    instance_id = resolve_uazapi_instance_id(payload)
    token = resolve_token(settings, token=None, instance=instance_id or None, admin_token=None)
    client = build_uazapi_client(settings, token=token)
    if audio_data:
        result = client.send_ptt_base64(number=target_jid, audio_data=audio_data)
    else:
        result = client.send_text(number=target_jid, text=response_text)
    return instance_id, result


async def process_ai_response(payload: dict[str, Any], lead_id: str, conversation_id: str, last_msg: str, message_id: str):
    try:
        with connect() as conn:
            lead = conn.execute(
                "SELECT name, phone, source, paused, manual_override FROM leads WHERE id = %s",
                (lead_id,),
            ).fetchone()
            if not lead:
                return
            lead_name, lead_phone, _lead_source, paused, manual_override = lead
            if paused or manual_override:
                logger.warning("AI response suppressed for lead=%s paused=%s manual_override=%s", lead_id, paused, manual_override)
                return

            fields = extract_message_fields(payload)
            chatid = fields.get("chatid") or ""
            current_msg = last_msg or ""
            msg_lower = normalize_command(current_msg)
            self_chat = is_self_chat(payload, chatid)
            target_jid = resolve_target_jid(payload, lead_phone)

            history_rows = crm_repo.list_messages(conn, conversation_id=conversation_id, limit=10)
            history = []
            for message in reversed(history_rows):
                if message.id == message_id:
                    continue
                role = "assistant" if message.direction == "out" else "user"
                history.append({"role": role, "content": message.body or ""})

            metadata = ensure_session_metadata(crm_repo.get_conversation_metadata(conn, conversation_id=conversation_id))
            last_activity = metadata.get("last_activity")
            if last_activity:
                try:
                    age = (datetime.now() - datetime.fromisoformat(last_activity)).total_seconds()
                    if age > SESSION_TIMEOUT_SECONDS and metadata.get("session_status") in {"active", "paused"}:
                        metadata["session_status"] = "expired"
                        metadata["active_persona"] = "iazinha"
                except Exception:
                    pass
            metadata["last_activity"] = datetime.now().isoformat()

            if msg_lower in RESET_COMMANDS:
                metadata = {
                    "session_status": "idle",
                    "active_persona": "iazinha",
                    "response_mode": "text",
                    "warmup_mode": False,
                    "jarvis_pending": False,
                    "last_activity": metadata["last_activity"],
                }
                response_text = "*IAzinha:* Sessao resetada. Use /iazinha ou /jarvis."
            elif msg_lower in END_COMMANDS:
                metadata["session_status"] = "closed"
                metadata["active_persona"] = "iazinha"
                metadata["jarvis_pending"] = False
                response_text = "*IAzinha:* Sessao encerrada."
            elif msg_lower in STATUS_COMMANDS:
                response_text = format_session_status(metadata, self_chat=self_chat)
            elif is_iazinha_activation_attempt(msg_lower):
                if self_chat:
                    metadata["session_status"] = "active"
                    metadata["active_persona"] = "iazinha"
                    metadata["jarvis_pending"] = False
                    response_text = "*IAzinha:* Prontinha. Pode falar comigo."
                else:
                    response_text = "*IAzinha:* Por agora eu ativo em self-chat."
            elif is_jarvis_activation_attempt(msg_lower):
                if not self_chat:
                    response_text = "*Jarvis:* Por agora eu ativo em self-chat."
                elif has_jarvis_password(msg_lower):
                    metadata["session_status"] = "active"
                    metadata["active_persona"] = "jarvis"
                    metadata["jarvis_pending"] = False
                    response_text = "*Jarvis:* Protocolo de ativacao validado."
                else:
                    metadata["jarvis_pending"] = True
                    response_text = "*Jarvis:* Informe a senha para ativacao."
            elif metadata.get("jarvis_pending") and has_jarvis_password(msg_lower):
                if self_chat:
                    metadata["session_status"] = "active"
                    metadata["active_persona"] = "jarvis"
                    metadata["jarvis_pending"] = False
                    response_text = "*Jarvis:* Protocolo de ativacao validado."
                else:
                    response_text = "*Jarvis:* Por agora eu ativo em self-chat."
            else:
                if metadata.get("session_status") != "active":
                    crm_repo.update_conversation_metadata(conn, conversation_id=conversation_id, metadata=metadata)
                    conn.commit()
                    return
                persona = metadata.get("active_persona", "iazinha")
                # RUP-2026-009: AgentService migrated to profile/principal_name/user_message signature.
                raw_response = agent_service.get_response(
                    profile="ops",
                    principal_name=lead_name or lead_phone or "Cliente",
                    user_message=current_msg,
                    history=history,
                )
                response_text = apply_persona_prefix(persona, raw_response)

            wants_audio = wants_audio_response(current_msg)
            audio_data = None
            if wants_audio:
                audio_text = response_text.replace("*IAzinha:*", "").replace("*Jarvis:*", "").strip()
                voice = "nova" if metadata.get("active_persona") == "iazinha" else "onyx"
                audio_data = media_service.text_to_speech_openai(audio_text, voice=voice)

            external_id = crm_repo.store_out_message(
                conn,
                conversation_id=conversation_id,
                text=response_text,
                raw={"processed_by": "assistant", "transport_provider": "uazapi", "audio_generated": bool(audio_data)},
            )
            crm_repo.update_conversation_metadata(conn, conversation_id=conversation_id, metadata=metadata)
            conn.commit()
            instance_id, res = send_assistant_response_via_uazapi(
                payload,
                target_jid=target_jid,
                response_text=response_text,
                audio_data=audio_data,
            )
            logger.warning(
                "Stored assistant response message id=%s provider=uazapi instance=%s target=%s audio=%s",
                external_id,
                instance_id,
                target_jid,
                bool(audio_data),
            )
            logger.warning("UAZAPI response instance=%s result=%s", instance_id, res)
    except UazapiError as exc:
        logger.exception("Error sending assistant response via UAZAPI: %s", exc)
    except Exception as exc:
        logger.exception("Error in process_ai_response: %s", exc)


@router.post("/uazapi")
async def uazapi_webhook(request: Request, background_tasks: BackgroundTasks) -> dict[str, Any]:
    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload must be a JSON object")

    raw_data = _payload_data(payload)
    message_data = _message_data(payload)

    try:
        with connect() as conn:
            result = ingest_uazapi_webhook(conn, payload)
            conn.commit()
            if result.stored and result.lead_id and result.conversation_id:
                fields = extract_message_fields(payload)
                chatid = fields.get("chatid") or ""
                body = fields.get("body") or ""
                from_me = fields.get("from_me")
                if not result.message_id and not body:
                    logger.warning(
                        "UAZAPI webhook vazio instance=%s event=%s chatid=%s data_keys=%s type=%s from_me=%s",
                        payload.get("instance") or raw_data.get("instance") or message_data.get("instance"),
                        payload.get("event"),
                        chatid,
                        sorted((message_data or raw_data).keys())[:40],
                        message_data.get("messageType") or message_data.get("type") or raw_data.get("messageType") or raw_data.get("type"),
                        from_me,
                    )
                self_chat = is_self_chat(payload, chatid)
                normalized_body = normalize_command(body)
                metadata = ensure_session_metadata(crm_repo.get_conversation_metadata(conn, conversation_id=result.conversation_id))
                explicit = (
                    is_iazinha_activation_attempt(normalized_body)
                    or normalized_body in (STATUS_COMMANDS | END_COMMANDS | RESET_COMMANDS)
                    or is_jarvis_activation_attempt(normalized_body)
                    or (metadata.get("jarvis_pending") and has_jarvis_password(normalized_body))
                )
                assistant_output = is_assistant_output_message(body)
                session_active = metadata.get("session_status") == "active"
                group_chat = is_group_chat(chatid)
                managed_cross_chat = is_managed_cross_chat(payload, fields, metadata)
                has_body = bool((body or "").strip())
                self_chat_turn = self_chat and session_active and has_body and not assistant_output
                inbound_turn = (not parse_bool(from_me)) and has_body and not assistant_output and not managed_cross_chat
                # RUP-2026-007: core anti-loop and anti-group-spam gate.
                # Respond only for explicit commands, active self-chat turns, or true inbound user turns.
                should_respond = (not group_chat) and bool(result.message_id) and has_body and (explicit or self_chat_turn or inbound_turn)
                logger.warning(
                    "Trigger chatid=%s from_me=%s explicit=%s self_chat=%s assistant_output=%s managed_cross_chat=%s session_active=%s has_body=%s message_id=%s should_respond=%s",
                    chatid, from_me, explicit, self_chat, assistant_output, managed_cross_chat, session_active, has_body, bool(result.message_id), should_respond,
                )
                if should_respond:
                    background_tasks.add_task(process_ai_response, payload, result.lead_id, result.conversation_id, body, result.message_id)
            return {
                "ok": True,
                "stored": result.stored,
                "lead_id": result.lead_id,
                "conversation_id": result.conversation_id,
                "message_id": result.message_id,
            }
    except Exception as exc:
        logger.exception("Webhook failure: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
