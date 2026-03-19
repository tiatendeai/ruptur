from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from psycopg import Connection
from psycopg.types.json import Jsonb


@dataclass(frozen=True)
class MissionRow:
    id: str
    title: str
    demand: str
    status: str
    priority: str
    owner: str | None
    team: str | None
    source: str
    acceptance_criteria: str | None
    due_date: str | None
    metadata: dict[str, Any] | None
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class MissionUpdateRow:
    id: str
    mission_id: str
    mission_title: str
    mission_status: str
    kind: str
    message: str
    created_by: str
    created_at: str


def create_mission(
    conn: Connection,
    *,
    title: str,
    demand: str,
    status: str,
    priority: str,
    owner: str | None,
    team: str | None,
    source: str,
    acceptance_criteria: str | None,
    due_date: date | None,
    metadata: dict[str, Any] | None,
) -> str:
    row = conn.execute(
        """
        INSERT INTO jarvis_missions (
          title, demand, status, priority, owner, team, source, acceptance_criteria, due_date, metadata, updated_at
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,now())
        RETURNING id::text
        """,
        (
            title,
            demand,
            status,
            priority,
            owner,
            team,
            source,
            acceptance_criteria,
            due_date,
            Jsonb(metadata) if metadata is not None else None,
        ),
    ).fetchone()
    return row[0]


def list_missions(
    conn: Connection,
    *,
    limit: int,
    status: str | None = None,
    priority: str | None = None,
    owner: str | None = None,
    team: str | None = None,
) -> list[MissionRow]:
    conditions: list[str] = []
    params: list[Any] = []

    if status:
        conditions.append("m.status = %s")
        params.append(status)
    if priority:
        conditions.append("m.priority = %s")
        params.append(priority)
    if owner:
        conditions.append("m.owner = %s")
        params.append(owner)
    if team:
        conditions.append("m.team = %s")
        params.append(team)

    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    params.append(limit)

    rows = conn.execute(
        f"""
        SELECT
          m.id::text,
          m.title,
          m.demand,
          m.status,
          m.priority,
          m.owner,
          m.team,
          m.source,
          m.acceptance_criteria,
          m.due_date::text,
          m.metadata,
          m.created_at::text,
          m.updated_at::text
        FROM jarvis_missions m
        {where_sql}
        ORDER BY
          CASE m.priority WHEN 'p0' THEN 0 WHEN 'p1' THEN 1 WHEN 'p2' THEN 2 ELSE 3 END ASC,
          m.updated_at DESC
        LIMIT %s
        """,
        tuple(params),
    ).fetchall()
    return [
        MissionRow(
            id=r[0],
            title=r[1],
            demand=r[2],
            status=r[3],
            priority=r[4],
            owner=r[5],
            team=r[6],
            source=r[7],
            acceptance_criteria=r[8],
            due_date=r[9],
            metadata=r[10],
            created_at=r[11],
            updated_at=r[12],
        )
        for r in rows
    ]


def get_mission(conn: Connection, *, mission_id: str) -> MissionRow | None:
    row = conn.execute(
        """
        SELECT
          m.id::text,
          m.title,
          m.demand,
          m.status,
          m.priority,
          m.owner,
          m.team,
          m.source,
          m.acceptance_criteria,
          m.due_date::text,
          m.metadata,
          m.created_at::text,
          m.updated_at::text
        FROM jarvis_missions m
        WHERE m.id = %s
        """,
        (mission_id,),
    ).fetchone()
    if not row:
        return None
    return MissionRow(
        id=row[0],
        title=row[1],
        demand=row[2],
        status=row[3],
        priority=row[4],
        owner=row[5],
        team=row[6],
        source=row[7],
        acceptance_criteria=row[8],
        due_date=row[9],
        metadata=row[10],
        created_at=row[11],
        updated_at=row[12],
    )


def update_mission(
    conn: Connection,
    *,
    mission_id: str,
    status: str | None = None,
    priority: str | None = None,
    owner: str | None = None,
    team: str | None = None,
    acceptance_criteria: str | None = None,
    due_date: date | None = None,
) -> bool:
    row = conn.execute("SELECT 1 FROM jarvis_missions WHERE id=%s", (mission_id,)).fetchone()
    if not row:
        return False

    set_sql: list[str] = []
    params: list[Any] = []
    if status is not None:
        set_sql.append("status=%s")
        params.append(status)
    if priority is not None:
        set_sql.append("priority=%s")
        params.append(priority)
    if owner is not None:
        set_sql.append("owner=%s")
        params.append(owner)
    if team is not None:
        set_sql.append("team=%s")
        params.append(team)
    if acceptance_criteria is not None:
        set_sql.append("acceptance_criteria=%s")
        params.append(acceptance_criteria)
    if due_date is not None:
        set_sql.append("due_date=%s")
        params.append(due_date)

    set_sql.append("updated_at=now()")
    params.append(mission_id)

    conn.execute(
        f"UPDATE jarvis_missions SET {', '.join(set_sql)} WHERE id=%s",
        tuple(params),
    )
    return True


def create_mission_update(
    conn: Connection,
    *,
    mission_id: str,
    kind: str,
    message: str,
    created_by: str,
) -> str | None:
    row = conn.execute("SELECT 1 FROM jarvis_missions WHERE id=%s", (mission_id,)).fetchone()
    if not row:
        return None

    update_row = conn.execute(
        """
        INSERT INTO jarvis_mission_updates (mission_id, kind, message, created_by)
        VALUES (%s,%s,%s,%s)
        RETURNING id::text
        """,
        (mission_id, kind, message, created_by),
    ).fetchone()
    conn.execute("UPDATE jarvis_missions SET updated_at=now() WHERE id=%s", (mission_id,))
    return update_row[0]


def list_mission_updates(conn: Connection, *, mission_id: str, limit: int) -> list[MissionUpdateRow]:
    rows = conn.execute(
        """
        SELECT
          u.id::text,
          u.mission_id::text,
          m.title,
          m.status,
          u.kind,
          u.message,
          u.created_by,
          u.created_at::text
        FROM jarvis_mission_updates u
        JOIN jarvis_missions m ON m.id = u.mission_id
        WHERE u.mission_id = %s
        ORDER BY u.created_at DESC
        LIMIT %s
        """,
        (mission_id, limit),
    ).fetchall()
    return [
        MissionUpdateRow(
            id=r[0],
            mission_id=r[1],
            mission_title=r[2],
            mission_status=r[3],
            kind=r[4],
            message=r[5],
            created_by=r[6],
            created_at=r[7],
        )
        for r in rows
    ]


def list_delivery_news(conn: Connection, *, limit: int) -> list[MissionUpdateRow]:
    rows = conn.execute(
        """
        SELECT
          u.id::text,
          u.mission_id::text,
          m.title,
          m.status,
          u.kind,
          u.message,
          u.created_by,
          u.created_at::text
        FROM jarvis_mission_updates u
        JOIN jarvis_missions m ON m.id = u.mission_id
        WHERE u.kind = 'delivery'
        ORDER BY u.created_at DESC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [
        MissionUpdateRow(
            id=r[0],
            mission_id=r[1],
            mission_title=r[2],
            mission_status=r[3],
            kind=r[4],
            message=r[5],
            created_by=r[6],
            created_at=r[7],
        )
        for r in rows
    ]


def mission_snapshot(conn: Connection) -> dict[str, int]:
    row = conn.execute(
        """
        SELECT
          COUNT(*) FILTER (WHERE status='planned')::int AS planned_count,
          COUNT(*) FILTER (WHERE status='in_progress')::int AS in_progress_count,
          COUNT(*) FILTER (WHERE status='blocked')::int AS blocked_count,
          COUNT(*) FILTER (WHERE status='done')::int AS done_count,
          COUNT(*) FILTER (WHERE status='canceled')::int AS canceled_count,
          COUNT(*) FILTER (
            WHERE status IN ('planned', 'in_progress', 'blocked')
              AND due_date IS NOT NULL
              AND due_date < current_date
          )::int AS overdue_open_count
        FROM jarvis_missions
        """
    ).fetchone()
    base = row or (0, 0, 0, 0, 0, 0)
    return {
        "planned_count": int(base[0] or 0),
        "in_progress_count": int(base[1] or 0),
        "blocked_count": int(base[2] or 0),
        "done_count": int(base[3] or 0),
        "canceled_count": int(base[4] or 0),
        "overdue_open_count": int(base[5] or 0),
    }
