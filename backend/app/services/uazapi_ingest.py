from __future__ import annotations

import json
<<<<<<< HEAD
=======
import logging
>>>>>>> work
from dataclasses import dataclass
from typing import Any

from psycopg import Connection
from psycopg.types.json import Jsonb

from app.services.qualification import qualify_text_v1


<<<<<<< HEAD
=======
logger = logging.getLogger(__name__)

MESSAGE_FIELD_HINTS = {
    "messageid",
    "id",
    "chatid",
    "wa_chatid",
    "chatId",
    "chat_id",
    "sender",
    "from",
    "text",
    "content",
    "fromMe",
    "isFromMe",
    "messageType",
    "type",
}


>>>>>>> work
@dataclass(frozen=True)
class IngestResult:
    stored: bool
    lead_id: str | None
    conversation_id: str | None
    message_id: str | None


def _digits_only(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


<<<<<<< HEAD
=======
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


>>>>>>> work
def extract_phone_from_jid(jid: str | None) -> str | None:
    if not jid:
        return None
    if "@g.us" in jid:
        return None
    digits = _digits_only(jid)
<<<<<<< HEAD
    return digits or None


def extract_chat_id(payload: dict[str, Any]) -> str | None:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    for key in ("chatid", "wa_chatid", "chatId", "chat_id"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    # fallback comum: a própria mensagem é o payload
    for key in ("chatid", "wa_chatid"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    sender = data.get("sender") if isinstance(data.get("sender"), str) else None
    return sender


def extract_message_fields(payload: dict[str, Any]) -> dict[str, Any]:
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload

    message_external_id = data.get("messageid") or data.get("id")
    sender = data.get("sender") or data.get("from")
    sender_name = data.get("senderName") or data.get("pushName")
    chatid = data.get("chatid") or extract_chat_id(payload)
    text = data.get("text")
    from_me = data.get("fromMe")

    body = None
    if isinstance(text, str) and text.strip():
        body = text
    else:
        content = data.get("content")
        if isinstance(content, str) and content.strip():
            body = content
        elif content is not None:
            body = json.dumps(content, ensure_ascii=False)

=======
    if digits and digits.startswith("55"):
        return neutralize_br_number(digits)
    return digits or None


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _first_str(source: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = source.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _message_candidates(payload: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    out: list[tuple[str, dict[str, Any]]] = []
    seen: set[int] = set()

    def add(label: str, candidate: Any) -> None:
        if not isinstance(candidate, dict) or not candidate:
            return
        ident = id(candidate)
        if ident in seen:
            return
        seen.add(ident)
        out.append((label, candidate))

    root = _as_dict(payload)
    add("payload.data", root.get("data"))
    add("payload", root)

    queue = list(out)
    while queue:
        parent_label, parent = queue.pop(0)
        for key in ("data", "message", "msg", "payload", "value"):
            child = parent.get(key)
            if isinstance(child, dict) and child:
                before = len(out)
                add(f"{parent_label}.{key}", child)
                if len(out) > before:
                    queue.append((f"{parent_label}.{key}", child))
    return out


def _looks_like_message(candidate: dict[str, Any]) -> bool:
    return any(key in candidate for key in MESSAGE_FIELD_HINTS)


def _select_message_data(payload: dict[str, Any]) -> dict[str, Any]:
    candidates = _message_candidates(payload)
    for _, candidate in candidates:
        if _looks_like_message(candidate):
            return candidate
    return candidates[0][1] if candidates else {}


def _extract_body_from_content(content: Any) -> str | None:
    if isinstance(content, str) and content.strip():
        return content
    if isinstance(content, dict):
        direct = _first_str(
            content,
            "text",
            "caption",
            "conversation",
            "description",
            "selectedDisplayText",
            "title",
            "body",
        )
        if direct:
            return direct
        if content:
            return json.dumps(content, ensure_ascii=False)
        return None
    if isinstance(content, (list, tuple)) and not content:
        return None
    if content is not None:
        return json.dumps(content, ensure_ascii=False)
    return None


def extract_chat_id(payload: dict[str, Any]) -> str | None:
    for _, candidate in _message_candidates(payload):
        for key in ("chatid", "wa_chatid", "chatId", "chat_id"):
            value = candidate.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    for key in ("chatid", "wa_chatid", "chatId", "chat_id"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    for _, candidate in _message_candidates(payload):
        sender = candidate.get("sender") or candidate.get("from")
        if isinstance(sender, str) and sender.strip():
            return sender.strip()
    return None


def extract_message_fields(payload: dict[str, Any]) -> dict[str, Any]:
    data = _select_message_data(payload)

    message_external_id = _first_str(data, "messageid", "id")
    sender = _first_str(data, "sender", "from", "wa_sender")
    sender_name = _first_str(data, "senderName", "pushName", "contactName", "name")
    chatid = _first_str(data, "chatid", "wa_chatid", "chatId", "chat_id") or extract_chat_id(payload)
    text = _first_str(data, "text")
    transcription = _first_str(data, "transcription")
    from_me = data.get("fromMe")
    if from_me is None:
        from_me = data.get("isFromMe")

    body = None
    if text:
        body = text
    elif transcription:
        body = f"[Áudio Transcrito]: {transcription}"
    else:
        body = _extract_body_from_content(data.get("content"))

    if not chatid and not body and not message_external_id:
        logger.warning(
            "UAZAPI ingest sem campos de mensagem top_keys=%s candidate_keys=%s",
            sorted(payload.keys())[:20],
            sorted(data.keys())[:40],
        )
>>>>>>> work
    return {
        "message_external_id": str(message_external_id) if message_external_id else None,
        "chatid": str(chatid) if chatid else None,
        "sender": str(sender) if sender else None,
        "sender_name": str(sender_name) if sender_name else None,
        "from_me": bool(from_me) if from_me is not None else None,
        "body": body,
        "data": data,
    }


def ingest_uazapi_webhook(conn: Connection, payload: dict[str, Any]) -> IngestResult:
    fields = extract_message_fields(payload)

    chatid = fields["chatid"]
    if not chatid:
        return IngestResult(stored=False, lead_id=None, conversation_id=None, message_id=None)

    phone = extract_phone_from_jid(chatid)

    lead_id: str | None = None
    if phone:
<<<<<<< HEAD
        row = conn.execute(
            """
            INSERT INTO leads (source, external_id, phone, name, updated_at)
            VALUES ('uazapi', %s, %s, %s, now())
            ON CONFLICT (phone) DO UPDATE
              SET updated_at = now(),
                  name = COALESCE(EXCLUDED.name, leads.name)
            RETURNING id::text
            """,
            (phone, phone, fields["sender_name"]),
        ).fetchone()
        lead_id = row[0] if row else None
=======
        row = conn.execute("SELECT id::text FROM leads WHERE phone = %s", (phone,)).fetchone()
        if row:
            conn.execute(
                """
                UPDATE leads
                SET updated_at = now(),
                    name = COALESCE(%s, name),
                    external_id = COALESCE(external_id, %s)
                WHERE phone = %s
                """,
                (fields["sender_name"], phone, phone),
            )
            lead_id = row[0]
        else:
            row = conn.execute(
                """
                INSERT INTO leads (source, external_id, phone, name, updated_at)
                VALUES ('uazapi', %s, %s, %s, now())
                RETURNING id::text
                """,
                (phone, phone, fields["sender_name"]),
            ).fetchone()
            lead_id = row[0] if row else None
>>>>>>> work
    else:
        row = conn.execute(
            """
            INSERT INTO leads (source, external_id, name, updated_at)
            VALUES ('uazapi', %s, %s, now())
            RETURNING id::text
            """,
            (chatid, fields["sender_name"]),
        ).fetchone()
        lead_id = row[0] if row else None

    row = conn.execute(
        """
        INSERT INTO conversations (lead_id, channel, external_id, updated_at)
        VALUES (%s, 'whatsapp', %s, now())
        ON CONFLICT (channel, external_id) DO UPDATE
          SET updated_at = now()
        RETURNING id::text
        """,
        (lead_id, chatid),
    ).fetchone()
    conversation_id = row[0] if row else None

    message_external_id = fields["message_external_id"]
    direction = "out" if fields["from_me"] is True else "in"

    if conversation_id and message_external_id:
        row = conn.execute(
            """
            INSERT INTO messages (conversation_id, external_id, direction, sender, body, raw)
            VALUES (%s, %s, %s, %s, %s, %s)
<<<<<<< HEAD
            ON CONFLICT (conversation_id, external_id) DO NOTHING
=======
            ON CONFLICT (conversation_id, external_id) DO UPDATE
              SET sender = COALESCE(messages.sender, EXCLUDED.sender),
                  body = CASE
                    WHEN (
                      messages.body IS NULL
                      OR btrim(messages.body) IN ('', '{}', '[]')
                    ) AND COALESCE(EXCLUDED.body, '') <> '' THEN EXCLUDED.body
                    ELSE messages.body
                  END,
                  raw = CASE
                    WHEN (
                      messages.body IS NULL
                      OR btrim(messages.body) IN ('', '{}', '[]')
                    ) AND COALESCE(EXCLUDED.body, '') <> '' THEN EXCLUDED.raw
                    ELSE COALESCE(messages.raw, EXCLUDED.raw)
                  END
>>>>>>> work
            RETURNING id::text
            """,
            (
                conversation_id,
                message_external_id,
                direction,
                fields["sender"] or fields["sender_name"],
                fields["body"],
                Jsonb(payload),
            ),
        ).fetchone()
        message_id = row[0] if row else None
    else:
        message_id = None

    if direction == "in" and lead_id:
        q = qualify_text_v1(fields["body"])
        if q:
            row = conn.execute("SELECT status FROM leads WHERE id = %s", (lead_id,)).fetchone()
            previous = row[0] if row else None
            if previous != q.status:
                conn.execute(
                    "UPDATE leads SET status = %s, updated_at = now() WHERE id = %s",
                    (q.status, lead_id),
                )
                conn.execute(
                    """
                    INSERT INTO pipeline_events (lead_id, event_type, payload)
                    VALUES (%s, 'lead_status_changed', %s)
                    """,
                    (lead_id, Jsonb({"from": previous, "to": q.status, "reason": q.reason})),
                )

    return IngestResult(stored=True, lead_id=lead_id, conversation_id=conversation_id, message_id=message_id)
