from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.db import DatabaseNotConfiguredError, connect
from app.repositories import sendflow_repo


router = APIRouter(prefix="/sendflow", tags=["sendflow"])


class Source(BaseModel):
    id: str
    provider: str
    external_id: str | None = None
    name: str | None = None
    instance_provider: str | None = None
    instance_id: str | None = None
    created_at: str


class CreateSourceRequest(BaseModel):
    provider: str = Field(min_length=1, description="whatsapp_group|whatsapp_community|manychat|landing|form|...")
    external_id: str | None = None
    name: str | None = None
    instance_provider: str | None = Field(default=None, description="uazapi|baileys (opcional)")
    instance_id: str | None = None


@router.get("/sources")
def list_sources(limit: int = Query(default=50, ge=1, le=200)) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = sendflow_repo.list_sources(conn, limit=limit)
            return {"ok": True, "sources": [Source(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "sources": [], "reason": "database_not_configured"}


@router.post("/sources")
def create_source(req: CreateSourceRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            source_id = sendflow_repo.create_source(
                conn,
                provider=req.provider,
                external_id=req.external_id,
                name=req.name,
                instance_provider=req.instance_provider,
                instance_id=req.instance_id,
            )
            conn.commit()
            return {"ok": True, "id": source_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


class OptInRequest(BaseModel):
    provider: str = Field(min_length=1, description="manychat|landing|form|...")
    phone: str = Field(min_length=8, description="Telefone (somente dígitos recomendado)")
    name: str | None = None
    source_id: str | None = Field(default=None, description="Opcional: id em sendflow_sources")
    channel: str = Field(default="whatsapp")
    consent: bool = Field(default=True, description="Deve ser true para opt-in")
    proof: dict[str, Any] = Field(default_factory=dict, description="Payload/evidência do opt-in (não remover)")


@router.post("/optin")
def opt_in(req: OptInRequest) -> dict[str, Any]:
    if not req.consent:
        raise HTTPException(status_code=400, detail="consent_required")
    phone = "".join(ch for ch in req.phone if ch.isdigit())
    if not phone:
        raise HTTPException(status_code=400, detail="phone_invalid")

    try:
        with connect() as conn:
            lead_id = sendflow_repo.upsert_lead_by_phone(conn, phone=phone, name=req.name, source=req.provider)
            opt_in_id = sendflow_repo.insert_opt_in(
                conn,
                lead_id=lead_id,
                source_id=req.source_id,
                channel=req.channel,
                consent=req.consent,
                proof=req.proof,
            )
            conn.commit()
            return {"ok": True, "lead_id": lead_id, "opt_in_id": opt_in_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
