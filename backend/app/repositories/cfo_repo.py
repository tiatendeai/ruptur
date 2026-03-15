from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from psycopg import Connection
from psycopg.types.json import Jsonb


@dataclass(frozen=True)
class ClientRow:
    id: str
    name: str
    segment: str | None
    active: bool
    notes: str | None
    created_at: str


@dataclass(frozen=True)
class ProjectRow:
    id: str
    name: str
    project_type: str
    status: str
    client_id: str | None
    client_name: str | None
    notes: str | None
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class DomainRow:
    id: str
    hostname: str
    registrar: str | None
    annual_cost_cents: int
    renews_on: str | None
    status: str
    project_id: str | None
    project_name: str | None
    notes: str | None
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class PayableRow:
    id: str
    description: str
    amount_cents: int
    due_date: str
    status: str
    category: str
    project_id: str | None
    project_name: str | None
    client_id: str | None
    client_name: str | None
    paid_at: str | None
    notes: str | None
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class ReceivableRow:
    id: str
    description: str
    amount_cents: int
    due_date: str
    status: str
    category: str
    project_id: str | None
    project_name: str | None
    client_id: str | None
    client_name: str | None
    received_at: str | None
    notes: str | None
    created_at: str
    updated_at: str


def create_client(conn: Connection, *, name: str, segment: str | None, active: bool, notes: str | None) -> str:
    row = conn.execute(
        """
        INSERT INTO cfo_clients (name, segment, active, notes)
        VALUES (%s,%s,%s,%s)
        RETURNING id::text
        """,
        (name, segment, active, notes),
    ).fetchone()
    return row[0]


def list_clients(conn: Connection, *, limit: int) -> list[ClientRow]:
    rows = conn.execute(
        """
        SELECT id::text, name, segment, active, notes, created_at::text
        FROM cfo_clients
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [ClientRow(id=r[0], name=r[1], segment=r[2], active=r[3], notes=r[4], created_at=r[5]) for r in rows]


def create_project(
    conn: Connection,
    *,
    name: str,
    project_type: str,
    status: str,
    client_id: str | None,
    notes: str | None,
) -> str:
    row = conn.execute(
        """
        INSERT INTO cfo_projects (name, project_type, status, client_id, notes, updated_at)
        VALUES (%s,%s,%s,%s,%s,now())
        RETURNING id::text
        """,
        (name, project_type, status, client_id, notes),
    ).fetchone()
    return row[0]


def list_projects(conn: Connection, *, limit: int) -> list[ProjectRow]:
    rows = conn.execute(
        """
        SELECT
          p.id::text,
          p.name,
          p.project_type,
          p.status,
          p.client_id::text,
          c.name,
          p.notes,
          p.created_at::text,
          p.updated_at::text
        FROM cfo_projects p
        LEFT JOIN cfo_clients c ON c.id = p.client_id
        ORDER BY p.updated_at DESC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [
        ProjectRow(
            id=r[0],
            name=r[1],
            project_type=r[2],
            status=r[3],
            client_id=r[4],
            client_name=r[5],
            notes=r[6],
            created_at=r[7],
            updated_at=r[8],
        )
        for r in rows
    ]


def create_domain(
    conn: Connection,
    *,
    hostname: str,
    registrar: str | None,
    annual_cost_cents: int,
    renews_on: date | None,
    status: str,
    project_id: str | None,
    notes: str | None,
) -> str:
    row = conn.execute(
        """
        INSERT INTO cfo_domains (hostname, registrar, annual_cost_cents, renews_on, status, project_id, notes, updated_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,now())
        RETURNING id::text
        """,
        (hostname, registrar, annual_cost_cents, renews_on, status, project_id, notes),
    ).fetchone()
    return row[0]


def list_domains(conn: Connection, *, limit: int) -> list[DomainRow]:
    rows = conn.execute(
        """
        SELECT
          d.id::text,
          d.hostname,
          d.registrar,
          d.annual_cost_cents,
          d.renews_on::text,
          d.status,
          d.project_id::text,
          p.name,
          d.notes,
          d.created_at::text,
          d.updated_at::text
        FROM cfo_domains d
        LEFT JOIN cfo_projects p ON p.id = d.project_id
        ORDER BY d.updated_at DESC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [
        DomainRow(
            id=r[0],
            hostname=r[1],
            registrar=r[2],
            annual_cost_cents=r[3],
            renews_on=r[4],
            status=r[5],
            project_id=r[6],
            project_name=r[7],
            notes=r[8],
            created_at=r[9],
            updated_at=r[10],
        )
        for r in rows
    ]


def create_payable(
    conn: Connection,
    *,
    description: str,
    amount_cents: int,
    due_date: date,
    status: str,
    category: str,
    project_id: str | None,
    client_id: str | None,
    notes: str | None,
) -> str:
    row = conn.execute(
        """
        INSERT INTO cfo_payables (description, amount_cents, due_date, status, category, project_id, client_id, notes, updated_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,now())
        RETURNING id::text
        """,
        (description, amount_cents, due_date, status, category, project_id, client_id, notes),
    ).fetchone()
    return row[0]


def list_payables(conn: Connection, *, limit: int, status: str | None = None) -> list[PayableRow]:
    params: list[Any] = []
    where_sql = ""
    if status:
        where_sql = "WHERE p.status = %s"
        params.append(status)
    params.append(limit)

    rows = conn.execute(
        f"""
        SELECT
          p.id::text,
          p.description,
          p.amount_cents,
          p.due_date::text,
          p.status,
          p.category,
          p.project_id::text,
          pr.name,
          p.client_id::text,
          c.name,
          p.paid_at::text,
          p.notes,
          p.created_at::text,
          p.updated_at::text
        FROM cfo_payables p
        LEFT JOIN cfo_projects pr ON pr.id = p.project_id
        LEFT JOIN cfo_clients c ON c.id = p.client_id
        {where_sql}
        ORDER BY p.due_date ASC, p.created_at DESC
        LIMIT %s
        """,
        tuple(params),
    ).fetchall()
    return [
        PayableRow(
            id=r[0],
            description=r[1],
            amount_cents=r[2],
            due_date=r[3],
            status=r[4],
            category=r[5],
            project_id=r[6],
            project_name=r[7],
            client_id=r[8],
            client_name=r[9],
            paid_at=r[10],
            notes=r[11],
            created_at=r[12],
            updated_at=r[13],
        )
        for r in rows
    ]


def update_payable_status(conn: Connection, *, payable_id: str, status: str) -> bool:
    row = conn.execute("SELECT 1 FROM cfo_payables WHERE id=%s", (payable_id,)).fetchone()
    if not row:
        return False
    conn.execute(
        """
        UPDATE cfo_payables
        SET
          status=%s,
          paid_at = CASE WHEN %s='paid' THEN now() ELSE NULL END,
          updated_at=now()
        WHERE id=%s
        """,
        (status, status, payable_id),
    )
    return True


def create_receivable(
    conn: Connection,
    *,
    description: str,
    amount_cents: int,
    due_date: date,
    status: str,
    category: str,
    project_id: str | None,
    client_id: str | None,
    notes: str | None,
) -> str:
    row = conn.execute(
        """
        INSERT INTO cfo_receivables (description, amount_cents, due_date, status, category, project_id, client_id, notes, updated_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,now())
        RETURNING id::text
        """,
        (description, amount_cents, due_date, status, category, project_id, client_id, notes),
    ).fetchone()
    return row[0]


def list_receivables(conn: Connection, *, limit: int, status: str | None = None) -> list[ReceivableRow]:
    params: list[Any] = []
    where_sql = ""
    if status:
        where_sql = "WHERE r.status = %s"
        params.append(status)
    params.append(limit)

    rows = conn.execute(
        f"""
        SELECT
          r.id::text,
          r.description,
          r.amount_cents,
          r.due_date::text,
          r.status,
          r.category,
          r.project_id::text,
          pr.name,
          r.client_id::text,
          c.name,
          r.received_at::text,
          r.notes,
          r.created_at::text,
          r.updated_at::text
        FROM cfo_receivables r
        LEFT JOIN cfo_projects pr ON pr.id = r.project_id
        LEFT JOIN cfo_clients c ON c.id = r.client_id
        {where_sql}
        ORDER BY r.due_date ASC, r.created_at DESC
        LIMIT %s
        """,
        tuple(params),
    ).fetchall()
    return [
        ReceivableRow(
            id=r[0],
            description=r[1],
            amount_cents=r[2],
            due_date=r[3],
            status=r[4],
            category=r[5],
            project_id=r[6],
            project_name=r[7],
            client_id=r[8],
            client_name=r[9],
            received_at=r[10],
            notes=r[11],
            created_at=r[12],
            updated_at=r[13],
        )
        for r in rows
    ]


def update_receivable_status(conn: Connection, *, receivable_id: str, status: str) -> bool:
    row = conn.execute("SELECT 1 FROM cfo_receivables WHERE id=%s", (receivable_id,)).fetchone()
    if not row:
        return False
    conn.execute(
        """
        UPDATE cfo_receivables
        SET
          status=%s,
          received_at = CASE WHEN %s='received' THEN now() ELSE NULL END,
          updated_at=now()
        WHERE id=%s
        """,
        (status, status, receivable_id),
    )
    return True


def project_margin_last_days(conn: Connection, *, days: int, limit: int) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        WITH rec AS (
          SELECT project_id, COALESCE(SUM(amount_cents), 0)::bigint AS total
          FROM cfo_receivables
          WHERE created_at >= (now() - (%s || ' days')::interval)
            AND status IN ('open', 'received')
          GROUP BY project_id
        ),
        pay AS (
          SELECT project_id, COALESCE(SUM(amount_cents), 0)::bigint AS total
          FROM cfo_payables
          WHERE created_at >= (now() - (%s || ' days')::interval)
            AND status IN ('open', 'paid')
          GROUP BY project_id
        )
        SELECT
          p.id::text,
          p.name,
          COALESCE(rec.total, 0)::bigint AS receivables_cents,
          COALESCE(pay.total, 0)::bigint AS payables_cents,
          (COALESCE(rec.total, 0) - COALESCE(pay.total, 0))::bigint AS net_cents
        FROM cfo_projects p
        LEFT JOIN rec ON rec.project_id = p.id
        LEFT JOIN pay ON pay.project_id = p.id
        ORDER BY net_cents DESC, p.name ASC
        LIMIT %s
        """,
        (days, days, limit),
    ).fetchall()
    return [
        {
            "project_id": r[0],
            "project_name": r[1],
            "receivables_cents": int(r[2] or 0),
            "payables_cents": int(r[3] or 0),
            "net_cents": int(r[4] or 0),
        }
        for r in rows
    ]


def insert_weekly_close_run(conn: Connection, *, reference_date: date, checklist: list[dict[str, Any]], summary: dict[str, Any]) -> str:
    row = conn.execute(
        """
        INSERT INTO cfo_weekly_close_runs (reference_date, checklist, summary)
        VALUES (%s, %s, %s)
        RETURNING id::text
        """,
        (reference_date, Jsonb(checklist), Jsonb(summary)),
    ).fetchone()
    return row[0]
