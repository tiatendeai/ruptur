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
    last_message_direction: str | None
    labels: list[str]
    assignee_name: str | None
    assignee_team: str | None
    paused: bool
    manual_override: bool
    queue_state: str


@dataclass(frozen=True)
class LabelRow:
    key: str
    name: str
    color: str


@dataclass(frozen=True)
class SavedViewRow:
    id: str
    scope: str
    name: str
    definition: dict[str, Any]
    position: int
    is_shared: bool


@dataclass(frozen=True)
class QueueSummaryRow:
    key: str
    total: int


@dataclass(frozen=True)
class MessageRow:
    id: str
    external_id: str
    direction: str
    sender: str | None
    body: str | None
    created_at: str
    raw: dict[str, Any] | None


def list_stages(conn: Connection) -> list[StageRow]:
    rows = conn.execute(
        """
        SELECT key, name, position, is_terminal
        FROM pipeline_stages
        ORDER BY position ASC, key ASC
        """
    ).fetchall()
    return [StageRow(key=r[0], name=r[1], position=r[2], is_terminal=r[3]) for r in rows]


def list_labels(conn: Connection) -> list[LabelRow]:
    rows = conn.execute(
        """
        SELECT key, name, color
        FROM crm_labels
        ORDER BY name ASC
        """
    ).fetchall()
    return [LabelRow(key=r[0], name=r[1], color=r[2]) for r in rows]


def create_label(conn: Connection, *, key: str, name: str, color: str) -> None:
    conn.execute(
        """
        INSERT INTO crm_labels (key, name, color)
        VALUES (%s, %s, %s)
        ON CONFLICT (key) DO UPDATE
          SET name = EXCLUDED.name,
              color = EXCLUDED.color
        """,
        (key, name, color),
    )


def list_saved_views(conn: Connection, *, scope: str) -> list[SavedViewRow]:
    rows = conn.execute(
        """
        SELECT id::text, scope, name, definition, position, is_shared
        FROM saved_views
        WHERE scope = %s
        ORDER BY position ASC, created_at ASC
        """,
        (scope,),
    ).fetchall()
    return [
        SavedViewRow(id=r[0], scope=r[1], name=r[2], definition=r[3] or {}, position=r[4], is_shared=r[5]) for r in rows
    ]


def create_saved_view(
    conn: Connection,
    *,
    scope: str,
    name: str,
    definition: dict[str, Any],
    position: int,
    is_shared: bool,
) -> str:
    row = conn.execute(
        """
        INSERT INTO saved_views (scope, name, definition, position, is_shared)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id::text
        """,
        (scope, name, Jsonb(definition), position, is_shared),
    ).fetchone()
    return row[0]


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
            m.body AS last_message_body,
            m.direction AS last_message_direction
          FROM messages m
          ORDER BY m.conversation_id, m.created_at DESC
        ),
        label_agg AS (
          SELECT
            ll.lead_id,
            array_agg(cl.key ORDER BY cl.name) AS labels
          FROM lead_label_links ll
          JOIN crm_labels cl ON cl.id = ll.label_id
          GROUP BY ll.lead_id
        )
        SELECT
          l.id::text,
          l.phone,
          l.name,
          l.status,
          l.updated_at::text,
          conv.conversation_id::text,
          last_msg.last_message_at::text,
          last_msg.last_message_body,
          last_msg.last_message_direction,
          COALESCE(label_agg.labels, '{{}}'::text[]),
          la.owner_name,
          la.team,
          l.paused,
          l.manual_override,
          CASE
            WHEN l.paused THEN 'paused'
            WHEN l.manual_override THEN 'manual'
            WHEN conv.conversation_id IS NULL THEN 'no_conversation'
            WHEN last_msg.last_message_direction = 'in' THEN 'awaiting_us'
            WHEN last_msg.last_message_direction = 'out' THEN 'awaiting_contact'
            ELSE 'active'
          END as queue_state
        FROM leads l
        LEFT JOIN conv ON conv.lead_id = l.id
        LEFT JOIN last_msg ON last_msg.conversation_id = conv.conversation_id
        LEFT JOIN label_agg ON label_agg.lead_id = l.id
        LEFT JOIN lead_assignments la ON la.lead_id = l.id
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
            last_message_direction=r[8],
            labels=list(r[9] or []),
            assignee_name=r[10],
            assignee_team=r[11],
            paused=r[12],
            manual_override=r[13],
            queue_state=_queue_state_from_row(
                paused=r[12],
                manual_override=r[13],
                conversation_id=r[5],
                last_message_direction=r[8],
            ),
        )
        for r in rows
    ]


def _queue_state_from_row(
    *,
    paused: bool,
    manual_override: bool,
    conversation_id: str | None,
    last_message_direction: str | None,
) -> str:
    if paused:
        return "paused"
    if manual_override:
        return "manual"
    if not conversation_id:
        return "no_conversation"
    if last_message_direction == "in":
        return "awaiting_us"
    if last_message_direction == "out":
        return "awaiting_contact"
    return "active"


def queue_summary(conn: Connection) -> list[QueueSummaryRow]:
    rows = conn.execute(
        """
        WITH conv AS (
          SELECT DISTINCT ON (c.lead_id)
            c.lead_id,
            c.id AS conversation_id
          FROM conversations c
          ORDER BY c.lead_id, c.updated_at DESC
        ),
        last_msg AS (
          SELECT DISTINCT ON (m.conversation_id)
            m.conversation_id,
            m.direction AS last_message_direction
          FROM messages m
          ORDER BY m.conversation_id, m.created_at DESC
        )
        SELECT
          CASE
            WHEN l.paused THEN 'paused'
            WHEN l.manual_override THEN 'manual'
            WHEN conv.conversation_id IS NULL THEN 'no_conversation'
            WHEN last_msg.last_message_direction = 'in' THEN 'awaiting_us'
            WHEN last_msg.last_message_direction = 'out' THEN 'awaiting_contact'
            ELSE 'active'
          END AS queue_state,
          COUNT(*)::int AS total
        FROM leads l
        LEFT JOIN conv ON conv.lead_id = l.id
        LEFT JOIN last_msg ON last_msg.conversation_id = conv.conversation_id
        GROUP BY 1
        ORDER BY 1
        """
    ).fetchall()
    return [QueueSummaryRow(key=r[0], total=r[1]) for r in rows]


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


def set_lead_automation_state(
    conn: Connection,
    *,
    lead_id: str,
    paused: bool | None,
    manual_override: bool | None,
) -> bool:
    row = conn.execute("SELECT paused, manual_override FROM leads WHERE id = %s", (lead_id,)).fetchone()
    if not row:
        return False
    next_paused = paused if paused is not None else row[0]
    next_manual_override = manual_override if manual_override is not None else row[1]
    conn.execute(
        """
        UPDATE leads
        SET paused = %s,
            manual_override = %s,
            updated_at = now()
        WHERE id = %s
        """,
        (next_paused, next_manual_override, lead_id),
    )
    conn.execute(
        "INSERT INTO pipeline_events (lead_id, event_type, payload) VALUES (%s,'automation_state_updated',%s)",
        (lead_id, Jsonb({"paused": next_paused, "manual_override": next_manual_override})),
    )
    return True


def set_lead_labels(conn: Connection, *, lead_id: str, label_keys: list[str]) -> bool:
    row = conn.execute("SELECT 1 FROM leads WHERE id = %s", (lead_id,)).fetchone()
    if not row:
        return False

    conn.execute("DELETE FROM lead_label_links WHERE lead_id = %s", (lead_id,))
    if label_keys:
        label_rows = conn.execute(
            "SELECT id FROM crm_labels WHERE key = ANY(%s)",
            (label_keys,),
        ).fetchall()
        for label_row in label_rows:
            conn.execute(
                """
                INSERT INTO lead_label_links (lead_id, label_id)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (lead_id, label_row[0]),
            )
    conn.execute(
        "INSERT INTO pipeline_events (lead_id, event_type, payload) VALUES (%s,'labels_updated',%s)",
        (lead_id, Jsonb({"labels": label_keys})),
    )
    return True


def assign_lead(conn: Connection, *, lead_id: str, owner_name: str | None, team: str | None) -> bool:
    row = conn.execute("SELECT 1 FROM leads WHERE id = %s", (lead_id,)).fetchone()
    if not row:
        return False
    conn.execute(
        """
        INSERT INTO lead_assignments (lead_id, owner_name, team, assigned_at, updated_at)
        VALUES (%s, %s, %s, now(), now())
        ON CONFLICT (lead_id) DO UPDATE
          SET owner_name = EXCLUDED.owner_name,
              team = EXCLUDED.team,
              updated_at = now()
        """,
        (lead_id, owner_name, team),
    )
    conn.execute(
        "INSERT INTO pipeline_events (lead_id, event_type, payload) VALUES (%s,'lead_assigned',%s)",
        (lead_id, Jsonb({"owner_name": owner_name, "team": team})),
    )
    return True


def list_messages(conn: Connection, *, conversation_id: str, limit: int) -> list[MessageRow]:
    rows = conn.execute(
        """
        SELECT id::text, external_id, direction, sender, body, created_at::text, raw
        FROM messages
        WHERE conversation_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (conversation_id, limit),
    ).fetchall()
    return [
        MessageRow(id=r[0], external_id=r[1], direction=r[2], sender=r[3], body=r[4], created_at=r[5], raw=r[6] or {})
        for r in rows
    ]


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
