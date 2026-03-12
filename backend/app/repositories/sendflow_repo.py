from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from psycopg import Connection
from psycopg.types.json import Jsonb


@dataclass(frozen=True)
class SourceRow:
    id: str
    provider: str
    external_id: str | None
    name: str | None
    instance_provider: str | None
    instance_id: str | None
    created_at: str


def list_sources(conn: Connection, *, limit: int) -> list[SourceRow]:
    rows = conn.execute(
        """
        SELECT id::text, provider, external_id, name, instance_provider, instance_id, created_at::text
        FROM sendflow_sources
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [SourceRow(*r) for r in rows]


def create_source(
    conn: Connection,
    *,
    provider: str,
    external_id: str | None,
    name: str | None,
    instance_provider: str | None,
    instance_id: str | None,
) -> str:
    row = conn.execute(
        """
        INSERT INTO sendflow_sources (provider, external_id, name, instance_provider, instance_id)
        VALUES (%s,%s,%s,%s,%s)
        RETURNING id::text
        """,
        (provider, external_id, name, instance_provider, instance_id),
    ).fetchone()
    return row[0]


def upsert_lead_by_phone(conn: Connection, *, phone: str, name: str | None, source: str) -> str:
    row = conn.execute(
        """
        INSERT INTO leads (source, external_id, phone, name, updated_at)
        VALUES (%s, %s, %s, %s, now())
        ON CONFLICT (phone) DO UPDATE
          SET updated_at = now(),
              name = COALESCE(EXCLUDED.name, leads.name)
        RETURNING id::text
        """,
        (source, phone, phone, name),
    ).fetchone()
    return row[0]


def insert_opt_in(
    conn: Connection,
    *,
    lead_id: str,
    source_id: str | None,
    channel: str,
    consent: bool,
    proof: dict[str, Any],
) -> str:
    row = conn.execute(
        """
        INSERT INTO opt_in_events (lead_id, source_id, channel, consent, proof)
        VALUES (%s,%s,%s,%s,%s)
        RETURNING id::text
        """,
        (lead_id, source_id, channel, consent, Jsonb(proof)),
    ).fetchone()
    conn.execute(
        "INSERT INTO pipeline_events (lead_id, event_type, payload) VALUES (%s,'opt_in_received',%s)",
        (lead_id, Jsonb({"source_id": source_id, "channel": channel, "consent": consent})),
    )
    return row[0]

