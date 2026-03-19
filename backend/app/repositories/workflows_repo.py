from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from psycopg import Connection
from psycopg.types.json import Jsonb


@dataclass(frozen=True)
class DueRunRow:
    run_id: str
    workflow_id: str
    lead_id: str
    opportunity_id: str | None
    workflow_key: str
    definition: dict[str, Any]
    state: dict[str, Any]


def list_due_runs(conn: Connection, *, limit: int) -> list[DueRunRow]:
    rows = conn.execute(
        """
        SELECT
          wr.id::text,
          wr.workflow_id::text,
          wr.lead_id::text,
          wr.opportunity_id::text,
          w.key,
          w.definition,
          wr.state
        FROM workflow_runs wr
        JOIN workflows w ON w.id = wr.workflow_id
        WHERE
          wr.status = 'running'
          AND wr.next_due_at IS NOT NULL
          AND wr.next_due_at <= now()
          AND w.is_active = true
        ORDER BY wr.next_due_at ASC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()

    out: list[DueRunRow] = []
    for run_id, workflow_id, lead_id, opportunity_id, key, definition, state in rows:
        out.append(
            DueRunRow(
                run_id=run_id,
                workflow_id=workflow_id,
                lead_id=lead_id,
                opportunity_id=opportunity_id,
                workflow_key=key,
                definition=definition or {},
                state=state or {},
            )
        )
    return out


def update_run_state(conn: Connection, *, run_id: str, state: dict[str, Any], status: str, next_due_at: str | None) -> None:
    conn.execute(
        """
        UPDATE workflow_runs
        SET state=%s, status=%s, next_due_at=%s, updated_at=now()
        WHERE id=%s
        """,
        (Jsonb(state), status, next_due_at, run_id),
    )


def insert_touchpoint(
    conn: Connection,
    *,
    lead_id: str,
    opportunity_id: str | None,
    channel: str,
    kind: str,
    direction: str | None,
    template_key: str | None,
    outcome: str | None,
    metadata: dict[str, Any] | None,
) -> None:
    conn.execute(
        """
        INSERT INTO touchpoints (lead_id, opportunity_id, channel, kind, direction, template_key, outcome, metadata)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (lead_id, opportunity_id, channel, kind, direction, template_key, outcome, Jsonb(metadata) if metadata is not None else None),
    )

