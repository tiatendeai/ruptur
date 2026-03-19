from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from psycopg import Connection
from psycopg.types.json import Jsonb


@dataclass(frozen=True)
class LeadScoreRow:
    lead_id: str
    score: int
    updated_at: str


@dataclass(frozen=True)
class ChannelHealthRow:
    provider: str
    instance_id: str
    score: int
    status: str
    updated_at: str


@dataclass(frozen=True)
class CampaignRow:
    id: str
    name: str
    kind: str
    provider_preference: str
    created_at: str


@dataclass(frozen=True)
class RoutingRuleRow:
    id: str
    name: str
    target_source_id: str
    action: str
    created_at: str


def upsert_lead_score(conn: Connection, *, lead_id: str, score: int, signals: dict[str, Any] | None) -> None:
    conn.execute(
        """
        INSERT INTO lead_scores (lead_id, score, signals, updated_at)
        VALUES (%s,%s,%s,now())
        ON CONFLICT (lead_id) DO UPDATE
          SET score = EXCLUDED.score,
              signals = EXCLUDED.signals,
              updated_at = now()
        """,
        (lead_id, score, Jsonb(signals) if signals is not None else None),
    )


def list_lead_scores(conn: Connection, *, limit: int) -> list[LeadScoreRow]:
    rows = conn.execute(
        """
        SELECT lead_id::text, score, updated_at::text
        FROM lead_scores
        ORDER BY updated_at DESC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [LeadScoreRow(lead_id=r[0], score=r[1], updated_at=r[2]) for r in rows]


def insert_hand_raise(conn: Connection, *, lead_id: str, kind: str, payload: dict[str, Any]) -> str:
    row = conn.execute(
        "INSERT INTO hand_raise_events (lead_id, kind, payload) VALUES (%s,%s,%s) RETURNING id::text",
        (lead_id, kind, Jsonb(payload)),
    ).fetchone()
    conn.execute("INSERT INTO pipeline_events (lead_id, event_type, payload) VALUES (%s,'hand_raise',%s)", (lead_id, Jsonb({"kind": kind})))
    return row[0]


def upsert_channel_health(
    conn: Connection, *, provider: str, instance_id: str, score: int, status: str, metrics: dict[str, Any] | None
) -> None:
    conn.execute(
        """
        INSERT INTO channel_health (provider, instance_id, score, status, metrics, updated_at)
        VALUES (%s,%s,%s,%s,%s,now())
        ON CONFLICT (provider, instance_id) DO UPDATE
          SET score = EXCLUDED.score,
              status = EXCLUDED.status,
              metrics = EXCLUDED.metrics,
              updated_at = now()
        """,
        (provider, instance_id, score, status, Jsonb(metrics) if metrics is not None else None),
    )


def list_channel_health(conn: Connection, *, limit: int) -> list[ChannelHealthRow]:
    rows = conn.execute(
        """
        SELECT provider, instance_id, score, status, updated_at::text
        FROM channel_health
        ORDER BY updated_at DESC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [ChannelHealthRow(provider=r[0], instance_id=r[1], score=r[2], status=r[3], updated_at=r[4]) for r in rows]


def create_campaign(conn: Connection, *, name: str, kind: str, provider_preference: str, payload: dict[str, Any]) -> str:
    row = conn.execute(
        """
        INSERT INTO campaigns (name, kind, provider_preference, payload)
        VALUES (%s,%s,%s,%s)
        RETURNING id::text
        """,
        (name, kind, provider_preference, Jsonb(payload)),
    ).fetchone()
    return row[0]


def list_campaigns(conn: Connection, *, limit: int) -> list[CampaignRow]:
    rows = conn.execute(
        """
        SELECT id::text, name, kind, provider_preference, created_at::text
        FROM campaigns
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [CampaignRow(id=r[0], name=r[1], kind=r[2], provider_preference=r[3], created_at=r[4]) for r in rows]


def create_routing_rule(
    conn: Connection,
    *,
    name: str,
    match: dict[str, Any],
    target_source_id: str,
    action: str,
    payload: dict[str, Any] | None,
) -> str:
    row = conn.execute(
        """
        INSERT INTO group_routing_rules (name, match, target_source_id, action, payload)
        VALUES (%s,%s,%s,%s,%s)
        RETURNING id::text
        """,
        (name, Jsonb(match), target_source_id, action, Jsonb(payload) if payload is not None else None),
    ).fetchone()
    return row[0]


def list_routing_rules(conn: Connection, *, limit: int) -> list[RoutingRuleRow]:
    rows = conn.execute(
        """
        SELECT id::text, name, target_source_id::text, action, created_at::text
        FROM group_routing_rules
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (limit,),
    ).fetchall()
    return [RoutingRuleRow(id=r[0], name=r[1], target_source_id=r[2], action=r[3], created_at=r[4]) for r in rows]

