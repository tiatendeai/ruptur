from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Any, Iterable

from psycopg import Connection
from psycopg.types.json import Jsonb


@dataclass(frozen=True)
class StageRow:
    key: str
    name: str
    position: int
    is_terminal: bool


@dataclass(frozen=True)
class LeadRow:
    id: str
    phone: str | None
    name: str | None
    status: str
    updated_at: str
    conversation_id: str | None
    last_message_at: str | None
    last_message_body: str | None


@dataclass(frozen=True)
class MessageRow:
    id: str
    external_id: str
    direction: str
    sender: str | None
    body: str | None
    created_at: str


def list_stages(conn: Connection) -> list[StageRow]:
    rows = conn.execute(
        """
        SELECT key, name, position, is_terminal
        FROM pipeline_stages
        ORDER BY position ASC, key ASC
        """
    ).fetchall()
    return [StageRow(key=r[0], name=r[1], position=r[2], is_terminal=r[3]) for r in rows]


def create_stage(conn: Connection, *, key: str, name: str, position: int, is_terminal: bool) -> None:
    conn.execute(
        "INSERT INTO pipeline_stages (key, name, position, is_terminal) VALUES (%s, %s, %s, %s)",
        (key, name, position, is_terminal),
    )


def update_stage(conn: Connection, *, key: str, name: str, position: int, is_terminal: bool) -> bool:
    row = conn.execute("SELECT 1 FROM pipeline_stages WHERE key = %s", (key,)).fetchone()
    if not row:
        return False
    conn.execute("UPDATE pipeline_stages SET name=%s, position=%s, is_terminal=%s WHERE key=%s", (name, position, is_terminal, key))
    return True


def list_leads(conn: Connection, *, status: str | None, q: str | None, limit: int) -> list[LeadRow]:
    params: list[Any] = []
    where: list[str] = []
    if status:
        where.append("l.status = %s")
        params.append(status)
    if q:
        where.append("(l.name ILIKE %s OR l.phone ILIKE %s)")
        params.extend([f"%{q}%", f"%{q}%"])
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    params.append(limit)

    rows = conn.execute(
        f"""
        WITH conv AS (
          SELECT DISTINCT ON (c.lead_id)
            c.lead_id,
            c.id AS conversation_id,
            c.updated_at
          FROM conversations c
          ORDER BY c.lead_id, c.updated_at DESC
        ),
        last_msg AS (
          SELECT DISTINCT ON (m.conversation_id)
            m.conversation_id,
            m.created_at AS last_message_at,
            m.body AS last_message_body
          FROM messages m
          ORDER BY m.conversation_id, m.created_at DESC
        )
        SELECT
          l.id::text,
          l.phone,
          l.name,
          l.status,
          l.updated_at::text,
          conv.conversation_id::text,
          last_msg.last_message_at::text,
          last_msg.last_message_body
        FROM leads l
        LEFT JOIN conv ON conv.lead_id = l.id
        LEFT JOIN last_msg ON last_msg.conversation_id = conv.conversation_id
        {where_sql}
        ORDER BY l.updated_at DESC
        LIMIT %s
        """,
        tuple(params),
    ).fetchall()

    return [
        LeadRow(
            id=r[0],
            phone=r[1],
            name=r[2],
            status=r[3],
            updated_at=r[4],
            conversation_id=r[5],
            last_message_at=r[6],
            last_message_body=r[7],
        )
        for r in rows
    ]


def update_lead(conn: Connection, *, lead_id: str, name: str | None, status: str | None) -> bool:
    row = conn.execute("SELECT 1 FROM leads WHERE id = %s", (lead_id,)).fetchone()
    if not row:
        return False
    conn.execute(
        "UPDATE leads SET name=COALESCE(%s,name), status=COALESCE(%s,status), updated_at=now() WHERE id=%s",
        (name, status, lead_id),
    )
    conn.execute(
        "INSERT INTO pipeline_events (lead_id, event_type, payload) VALUES (%s,'lead_updated',%s)",
        (lead_id, Jsonb({"name": name, "status": status})),
    )
    return True


def list_messages(conn: Connection, *, conversation_id: str, limit: int) -> list[MessageRow]:
    rows = conn.execute(
        """
        SELECT id::text, external_id, direction, sender, body, created_at::text
        FROM messages
        WHERE conversation_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (conversation_id, limit),
    ).fetchall()
    return [MessageRow(id=r[0], external_id=r[1], direction=r[2], sender=r[3], body=r[4], created_at=r[5]) for r in rows]


def get_conversation_external_id(conn: Connection, *, conversation_id: str) -> str | None:
    row = conn.execute("SELECT external_id FROM conversations WHERE id = %s", (conversation_id,)).fetchone()
    return row[0] if row else None


def store_out_message(conn: Connection, *, conversation_id: str, text: str, raw: dict[str, Any]) -> str:
    external_id = str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO messages (conversation_id, external_id, direction, sender, body, raw)
        VALUES (%s, %s, 'out', %s, %s, %s)
        """,
        (conversation_id, external_id, "me", text, Jsonb(raw)),
    )
    conn.execute("UPDATE conversations SET updated_at = now() WHERE id = %s", (conversation_id,))
    return external_id


def upsert_pipeline_stages(conn: Connection, items: Iterable[StageRow]) -> None:
    for s in items:
        conn.execute(
            """
            INSERT INTO pipeline_stages (key, name, position, is_terminal)
            VALUES (%s,%s,%s,%s)
            ON CONFLICT (key) DO UPDATE
              SET name = EXCLUDED.name,
                  position = EXCLUDED.position,
                  is_terminal = EXCLUDED.is_terminal
            """,
            (s.key, s.name, s.position, s.is_terminal),
        )

