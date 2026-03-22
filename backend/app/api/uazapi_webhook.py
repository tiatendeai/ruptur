from __future__ import annotations

import logging
import re
from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.db import connect
from app.repositories import crm_repo, jarvis_ops_repo
from app.clients.uazapi import UazapiError
from app.services.agent_service import agent_service
from app.services.jarvis_daily_brief_service import build_executive_daily_brief
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
AUDIO_REQUEST_PATTERNS = (
    r"\bme\s+responda\s+em\s+[aá]udio\b",
    r"\bresponda\s+em\s+[aá]udio\b",
    r"\bme\s+mande\s+(um\s+)?[aá]udio\b",
    r"\bmande\s+(a\s+resposta\s+)?em\s+[aá]udio\b",
    r"\bme\s+responda\s+por\s+voz\b",
    r"\bresponda\s+por\s+voz\b",
    r"\bem\s+[aá]udio\b",
    r"\bpor\s+[aá]udio\b",
    r"\bem\s+voz\b",
)


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
    return normalized in IAZINHA_COMMANDS


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


def extract_inline_persona_request(value: str | None) -> tuple[str | None, str | None]:
    text = (value or "").strip()
    if not text:
        return None, None

    patterns = (
        (
            "iazinha",
            r"^(?:/start-iazinha|/iazinha|iazinha|/assistant|assistant|/start-assistant|/start-assistente)(?:\s*[:,-])?\s+(.+)$",
        ),
        (
            "jarvis",
            r"^(?:/jarvis|jarvis)(?:\s*[:,-])?\s+(.+)$",
        ),
    )
    for persona, pattern in patterns:
        match = re.match(pattern, text, flags=re.IGNORECASE)
        if match:
            prompt = (match.group(1) or "").strip()
            if prompt:
                return persona, prompt
    return None, None


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
    chat = payload.get("chat") if isinstance(payload.get("chat"), dict) else {}
    owner = str(payload.get("owner") or chat.get("owner") or message_data.get("owner") or "").strip()
    sender = str(
        message_data.get("sender_pn")
        or message_data.get("wa_sender")
        or message_data.get("sender")
        or data.get("wa_sender")
        or data.get("sender")
        or ""
    ).strip()
    from_me = message_data.get("fromMe")
    if from_me is None:
        from_me = message_data.get("isFromMe")
    if from_me is None:
        from_me = data.get("fromMe")
    if from_me is None:
        from_me = data.get("isFromMe")
    me_jid = (
        payload.get("meJid")
        or data.get("meJid")
        or message_data.get("meJid")
        or sender
        or owner
    )
    if bool(normalize_target(chatid) and normalize_target(chatid) == normalize_target(me_jid)):
        return True
    if bool(normalize_target(chatid) and normalize_target(chatid) == normalize_target(owner)):
        return True
    if bool(sender and normalize_target(chatid) == normalize_target(sender)):
        return True
    # WhatsApp desktop/self threads can arrive as @lid chats instead of the phone JID.
    if chatid.endswith("@lid"):
        me_phone = normalize_target(me_jid)
        sender_phone = normalize_target(sender)
        sender_is_self = bool(sender_phone and sender_phone == me_phone)
        if sender_is_self or sender == chatid:
            return True
        sender_is_lid = bool(sender and sender.endswith("@lid"))
        if parse_bool(from_me) and (sender_is_lid or not sender):
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


def extract_transcribed_audio_text(body: str | None) -> str | None:
    text = (body or "").strip()
    if not text:
        return None
    prefix_pattern = r"^\[\s*[aá]udio\s+transcrito\s*\]\s*:\s*"
    if re.match(prefix_pattern, text, flags=re.IGNORECASE):
        cleaned = re.sub(prefix_pattern, "", text, flags=re.IGNORECASE).strip()
        return cleaned or None
    return None


def is_audio_message_payload(payload: dict[str, Any]) -> bool:
    data = _payload_data(payload)
    message_data = _message_data(payload)
    signature = " ".join(
        str(value or "").lower()
        for value in (
            message_data.get("messageType"),
            message_data.get("type"),
            message_data.get("mediaType"),
            message_data.get("mimeType"),
            data.get("messageType"),
            data.get("type"),
            data.get("mediaType"),
            data.get("mimeType"),
        )
    )
    return any(token in signature for token in ("audio", "voice", "ptt", "myaudio"))


def strip_audio_request_instruction(body: str | None) -> str:
    text = (body or "").strip()
    cleaned = text
    for pattern in AUDIO_REQUEST_PATTERNS:
        cleaned = re.sub(pattern, " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,.;:-")
    return cleaned or text


def audio_response_context(persona: str) -> list[str]:
    persona_label = "IAzinha" if persona == "iazinha" else "Jarvis"
    return [
        f"O transporte vai converter sua resposta em audio/PTT no WhatsApp para a persona {persona_label}.",
        "Nunca diga que nao consegue responder em audio, que so consegue texto ou que nao tem voz.",
        "Responda normalmente ao pedido principal do usuario; a entrega em audio sera cuidada fora do modelo.",
        "E proibido responder com recusas do tipo 'nao consigo responder por audio' ou equivalentes.",
    ]


def is_operational_brief_request(value: str | None) -> bool:
    normalized = normalize_command(value)
    if not normalized:
        return False
    anchor_hits = (
        "resumo operacional",
        "status operacional",
        "brief operacional",
        "resumo executivo",
        "resumo curto",
        "daily executiva",
    )
    context_hits = (
        "ontem",
        "hoje",
        "amanha",
        "amanhã",
        "desafio",
        "impedimento",
        "vitoria",
        "vitória",
        "avanco",
        "avanço",
        "oportunidade",
    )
    return any(token in normalized for token in anchor_hits) and any(token in normalized for token in context_hits)


def build_operational_duo_response(
    *,
    conn: Any,
    principal_name: str,
    limit: int = 5,
) -> str:
    snapshot = jarvis_ops_repo.mission_snapshot(conn)
    blocked = jarvis_ops_repo.list_missions(conn, limit=limit, status="blocked")
    critical_in_progress = jarvis_ops_repo.list_missions(conn, limit=limit, status="in_progress", priority="p0")
    critical_planned = jarvis_ops_repo.list_missions(conn, limit=limit, status="planned", priority="p0")
    delivery_news = jarvis_ops_repo.list_delivery_news(conn, limit=limit)
    brief = build_executive_daily_brief(
        principal_name=principal_name,
        reference_date=date.today(),
        snapshot=snapshot,
        blocked=[row.__dict__ for row in blocked],
        critical_in_progress=[row.__dict__ for row in critical_in_progress],
        critical_planned=[row.__dict__ for row in critical_planned],
        delivery_news=[row.__dict__ for row in delivery_news],
        include_ai=True,
    )
    status_summary = str(brief.get("duo", {}).get("status", {}).get("summary") or "").strip()
    jarvis_summary = str(brief.get("duo", {}).get("jarvis", {}).get("summary") or "").strip()
    parts = [part for part in (status_summary, jarvis_summary) if part]
    if parts:
        return "\n\n".join(parts)
    return "*IAzinha:* Ainda nao consegui montar o resumo operacional agora."


def apply_persona_prefix(persona: str, text: str | None) -> str:
    normalized = (text or "").strip()
    if not normalized:
        normalized = "Desculpe, nao consegui montar uma resposta agora."
    low = normalized.lower()
    if low.startswith("*iazinha:*") or low.startswith("*jarvis:*"):
        return normalized
    prefix = "*Jarvis:*" if persona == "jarvis" else "*IAzinha:*"
    return f"{prefix} {normalized}"


def transcribe_inbound_audio_via_uazapi(payload: dict[str, Any], message_external_id: str | None) -> str | None:
    if not message_external_id or not settings.openai_api_key:
        return None

    instance_id = resolve_uazapi_instance_id(payload)
    message_data = _message_data(payload)
    data = _payload_data(payload)
    token = resolve_token(
        settings,
        token=str(payload.get("token") or data.get("token") or message_data.get("token") or "").strip() or None,
        instance=instance_id or None,
        admin_token=None,
    )
    client = build_uazapi_client(settings, token=token)
    try:
        result = client.download_message(
            message_id=message_external_id,
            transcribe=True,
            generate_mp3=True,
            return_link=False,
            openai_apikey=settings.openai_api_key,
        )
    except UazapiError as exc:
        logger.warning(
            "UAZAPI transcribe fallback falhou instance=%s message=%s error=%s",
            instance_id,
            message_external_id,
            exc,
        )
        return None
    transcription = result.get("transcription") if isinstance(result, dict) else None
    if isinstance(transcription, str) and transcription.strip():
        return transcription.strip()
    return None


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
    chat = payload.get("chat") if isinstance(payload.get("chat"), dict) else {}
    owner = canonical_business_phone(
        payload.get("meJid")
        or data.get("meJid")
        or message_data.get("meJid")
        or payload.get("owner")
        or chat.get("owner")
        or message_data.get("owner")
        or ""
    )
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
    explicit = str(
        payload.get("instance")
        or payload.get("instanceName")
        or data.get("instance")
        or data.get("instanceName")
        or message_data.get("instance")
        or message_data.get("instanceName")
        or ""
    ).strip()
    return explicit


def resolve_target_candidates(payload: dict[str, Any], lead_phone: str | None = None) -> list[str]:
    data = _payload_data(payload)
    message_data = _message_data(payload)
    raw_chatid = str(message_data.get("chatid") or message_data.get("wa_chatid") or data.get("chatid") or data.get("wa_chatid") or "").strip()
    me_jid = str(payload.get("meJid") or data.get("meJid") or message_data.get("meJid") or "").strip()
    out: list[str] = []
    seen: set[str] = set()

    def add_candidate(value: str | None) -> None:
        candidate = str(value or "").strip()
        if not candidate or candidate == "status@broadcast" or "@g.us" in candidate or candidate in seen:
            return
        seen.add(candidate)
        out.append(candidate)

    # First try the exact inbound thread, including @lid, so the reply lands in the same channel.
    add_candidate(raw_chatid)

    # RUP-2026-015 fallback: when we also have a stable direct user JID/phone,
    # keep it as a retry target without force-inserting the BR 9th digit.
    for candidate in (me_jid, lead_phone):
        add_candidate(direct_user_jid(candidate))

    if lead_phone:
        add_candidate(canonical_jid(lead_phone))

    return out


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
    target_candidates: list[str],
    response_text: str,
    audio_data: bytes | None,
) -> tuple[str, str, dict[str, Any]]:
    instance_id = resolve_uazapi_instance_id(payload)
    message_data = _message_data(payload)
    data = _payload_data(payload)
    token = resolve_token(
        settings,
        token=str(payload.get("token") or data.get("token") or message_data.get("token") or "").strip() or None,
        instance=instance_id or None,
        admin_token=None,
    )
    client = build_uazapi_client(settings, token=token)
    last_error: UazapiError | None = None
    for target_jid in target_candidates:
        try:
            if audio_data:
                result = client.send_ptt_base64(number=target_jid, audio_data=audio_data)
            else:
                result = client.send_text(number=target_jid, text=response_text)
            return instance_id, target_jid, result
        except UazapiError as exc:
            last_error = exc
            logger.warning("UAZAPI send retry instance=%s target=%s error=%s", instance_id, target_jid, exc)
    if last_error is not None:
        raise last_error
    raise UazapiError("uazapi_missing_target")


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
            transcribed_body = extract_transcribed_audio_text(current_msg)
            if transcribed_body:
                current_msg = transcribed_body
            elif is_audio_message_payload(payload):
                fallback_transcription = transcribe_inbound_audio_via_uazapi(
                    payload,
                    fields.get("message_external_id"),
                )
                if fallback_transcription:
                    current_msg = fallback_transcription
            msg_lower = normalize_command(current_msg)
            self_chat = is_self_chat(payload, chatid)
            target_candidates = resolve_target_candidates(payload, lead_phone)
            inline_persona, inline_prompt = extract_inline_persona_request(current_msg)
            source_user_message = inline_prompt or current_msg
            wants_audio = wants_audio_response(source_user_message)
            effective_user_message = strip_audio_request_instruction(source_user_message) if wants_audio else source_user_message

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
            response_text: str | None = None

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
                if inline_persona == "iazinha":
                    metadata["session_status"] = "active"
                    metadata["active_persona"] = "iazinha"
                    metadata["jarvis_pending"] = False
                elif inline_persona == "jarvis":
                    if not self_chat:
                        response_text = "*Jarvis:* Por agora eu ativo em self-chat."
                        inline_persona = None
                    elif metadata.get("active_persona") != "jarvis":
                        response_text = "*Jarvis:* Ative primeiro com /jarvis e a senha."
                        inline_persona = None
                if response_text is None and inline_persona is None and metadata.get("session_status") != "active":
                    crm_repo.update_conversation_metadata(conn, conversation_id=conversation_id, metadata=metadata)
                    conn.commit()
                    return
                if response_text is not None:
                    persona = metadata.get("active_persona", "iazinha")
                elif inline_persona is None:
                    persona = metadata.get("active_persona", "iazinha")
                else:
                    persona = inline_persona
                principal_name = "Diego" if self_chat else (lead_name or lead_phone or "Cliente")
                if response_text is not None:
                    pass
                elif persona == "iazinha" and self_chat and is_operational_brief_request(effective_user_message):
                    response_text = build_operational_duo_response(
                        conn=conn,
                        principal_name=principal_name,
                    )
                else:
                    context_blocks = audio_response_context(persona) if wants_audio else None
                    raw_response = agent_service.get_response(
                        profile="ops",
                        principal_name=principal_name,
                        user_message=effective_user_message,
                        persona=persona,
                        history=history,
                        context_blocks=context_blocks,
                    )
                    response_text = apply_persona_prefix(persona, raw_response)

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
            instance_id, target_used, res = send_assistant_response_via_uazapi(
                payload,
                target_candidates=target_candidates,
                response_text=response_text,
                audio_data=audio_data,
            )
            logger.warning(
                "Stored assistant response message id=%s provider=uazapi instance=%s target=%s audio=%s",
                external_id,
                instance_id,
                target_used,
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
                inline_persona, inline_prompt = extract_inline_persona_request(body)
                metadata = ensure_session_metadata(crm_repo.get_conversation_metadata(conn, conversation_id=result.conversation_id))
                explicit = (
                    is_iazinha_activation_attempt(normalized_body)
                    or normalized_body in (STATUS_COMMANDS | END_COMMANDS | RESET_COMMANDS)
                    or is_jarvis_activation_attempt(normalized_body)
                    or (metadata.get("jarvis_pending") and has_jarvis_password(normalized_body))
                    or bool(inline_persona and inline_prompt)
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
