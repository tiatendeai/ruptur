from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.db import DatabaseNotConfiguredError, connect
from app.repositories import growth_repo


router = APIRouter(prefix="/growth", tags=["growth"])


class LeadScore(BaseModel):
    lead_id: str
    score: int
    updated_at: str


class SetLeadScoreRequest(BaseModel):
    lead_id: str = Field(min_length=1)
    score: int = Field(ge=0, le=100)
    signals: dict[str, Any] | None = None


@router.get("/leadscores")
def list_leadscores(limit: int = Query(default=50, ge=1, le=200)) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = growth_repo.list_lead_scores(conn, limit=limit)
            return {"ok": True, "items": [LeadScore(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}


@router.post("/leadscores")
def set_leadscore(req: SetLeadScoreRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            growth_repo.upsert_lead_score(conn, lead_id=req.lead_id, score=req.score, signals=req.signals)
            conn.commit()
            return {"ok": True}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


class HandRaiseRequest(BaseModel):
    lead_id: str = Field(min_length=1)
    kind: str = Field(default="generic")
    payload: dict[str, Any] = Field(default_factory=dict)


@router.post("/handraise")
def hand_raise(req: HandRaiseRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            event_id = growth_repo.insert_hand_raise(conn, lead_id=req.lead_id, kind=req.kind, payload=req.payload)
            conn.commit()
            return {"ok": True, "id": event_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


class ChannelHealth(BaseModel):
    provider: str
    instance_id: str
    score: int
    status: str
    updated_at: str


class UpsertChannelHealthRequest(BaseModel):
    provider: str = Field(min_length=1, description="uazapi|baileys")
    instance_id: str = Field(min_length=1)
    score: int = Field(ge=0, le=100)
    status: str = Field(default="unknown")
    metrics: dict[str, Any] | None = None


@router.get("/channels/health")
def list_channels_health(limit: int = Query(default=50, ge=1, le=200)) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = growth_repo.list_channel_health(conn, limit=limit)
            return {"ok": True, "items": [ChannelHealth(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}


@router.post("/channels/health")
def upsert_channel_health(req: UpsertChannelHealthRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            growth_repo.upsert_channel_health(
                conn,
                provider=req.provider,
                instance_id=req.instance_id,
                score=req.score,
                status=req.status,
                metrics=req.metrics,
            )
            conn.commit()
            return {"ok": True}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


class Campaign(BaseModel):
    id: str
    name: str
    kind: str
    provider_preference: str
    created_at: str


class CreateCampaignRequest(BaseModel):
    name: str = Field(min_length=1)
    kind: str = Field(min_length=1, description="one_to_one|group")
    provider_preference: str = Field(default="uazapi", description="uazapi|baileys|auto(auto=>uazapi no MVP)")
    payload: dict[str, Any] = Field(default_factory=dict)


def _normalize_provider_preference(value: str | None) -> str:
    normalized = (value or "uazapi").strip().lower()
    if normalized in {"", "auto"}:
        # MVP rule: auto resolves to the primary provider instead of keeping
        # ambiguous routing semantics in persisted campaign intent.
        return "uazapi"
    if normalized not in {"uazapi", "baileys"}:
        raise HTTPException(status_code=400, detail="provider_preference_invalid")
    return normalized


@router.get("/campaigns")
def list_campaigns(limit: int = Query(default=50, ge=1, le=200)) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = growth_repo.list_campaigns(conn, limit=limit)
            return {"ok": True, "items": [Campaign(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}


@router.post("/campaigns")
def create_campaign(req: CreateCampaignRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            campaign_id = growth_repo.create_campaign(
                conn,
                name=req.name,
                kind=req.kind,
                provider_preference=_normalize_provider_preference(req.provider_preference),
                payload=req.payload,
            )
            conn.commit()
            return {"ok": True, "id": campaign_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


class RoutingRule(BaseModel):
    id: str
    name: str
    target_source_id: str
    action: str
    created_at: str


class CreateRoutingRuleRequest(BaseModel):
    name: str = Field(min_length=1)
    match: dict[str, Any] = Field(default_factory=dict)
    target_source_id: str = Field(min_length=1)
    action: str = Field(default="invite", description="invite|notify_group")
    payload: dict[str, Any] | None = None


@router.get("/routing/rules")
def list_routing_rules(limit: int = Query(default=50, ge=1, le=200)) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = growth_repo.list_routing_rules(conn, limit=limit)
            return {"ok": True, "items": [RoutingRule(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}


@router.post("/routing/rules")
def create_routing_rule(req: CreateRoutingRuleRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            rule_id = growth_repo.create_routing_rule(
                conn,
                name=req.name,
                match=req.match,
                target_source_id=req.target_source_id,
                action=req.action,
                payload=req.payload,
            )
            conn.commit()
            return {"ok": True, "id": rule_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
