from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from psycopg import Connection
from psycopg.types.json import Jsonb

from app.services.qualification import qualify_text_v1


@dataclass(frozen=True)
class IngestResult:
    stored: bool
    lead_id: str | None
    conversation_id: str | None
    message_id: str | None


def _digits_only(value: str) -> str:
    return "".join(ch for ch in value if ch.isdigit())


def extract_phone_from_jid(jid: str | None) -> str | None:
    if not jid:
        return None
    if "@g.us" in jid:
        return None
    digits = _digits_only(jid)
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
            ON CONFLICT (conversation_id, external_id) DO NOTHING
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
