from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.clients.uazapi import UazapiError
from app.db import DatabaseNotConfiguredError, connect
from app.repositories import crm_repo
from app.settings import settings
from app.uazapi_runtime import client, resolve_token


router = APIRouter(prefix="/crm", tags=["crm"])


class Stage(BaseModel):
    key: str = Field(min_length=1)
    name: str = Field(min_length=1)
    position: int = 0
    is_terminal: bool = False


class CreateStageRequest(BaseModel):
    key: str = Field(min_length=1)
    name: str = Field(min_length=1)
    position: int = 0
    is_terminal: bool = False


class UpdateStageRequest(BaseModel):
    name: str | None = None
    position: int | None = None
    is_terminal: bool | None = None


@router.get("/stages")
def list_stages() -> dict[str, Any]:
    try:
        with connect() as conn:
            stages = crm_repo.list_stages(conn)
            return {"ok": True, "stages": [Stage(**s.__dict__).model_dump() for s in stages]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "stages": [], "reason": "database_not_configured"}


@router.post("/stages")
def create_stage(req: CreateStageRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            crm_repo.create_stage(conn, key=req.key, name=req.name, position=req.position, is_terminal=req.is_terminal)
            conn.commit()
            return {"ok": True}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


@router.patch("/stages/{key}")
def update_stage(key: str, req: UpdateStageRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            current = {s.key: s for s in crm_repo.list_stages(conn)}.get(key)
            if not current:
                raise HTTPException(status_code=404, detail="stage_not_found")
            name = req.name if req.name is not None else current.name
            position = req.position if req.position is not None else current.position
            is_terminal = req.is_terminal if req.is_terminal is not None else current.is_terminal
            ok = crm_repo.update_stage(conn, key=key, name=name, position=position, is_terminal=is_terminal)
            if not ok:
                raise HTTPException(status_code=404, detail="stage_not_found")
            conn.commit()
            return {"ok": True}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


class Lead(BaseModel):
    id: str
    phone: str | None = None
    name: str | None = None
    status: str
    updated_at: str
    conversation_id: str | None = None
    last_message_at: str | None = None
    last_message_body: str | None = None


@router.get("/leads")
def list_leads(
    status: str | None = Query(default=None),
    q: str | None = Query(default=None, description="Filtro simples por nome/telefone"),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = crm_repo.list_leads(conn, status=status, q=q, limit=limit)
            leads = [Lead(**r.__dict__).model_dump() for r in rows]
            return {"ok": True, "leads": leads}
    except DatabaseNotConfiguredError:
        return {"ok": True, "leads": [], "reason": "database_not_configured"}


class UpdateLeadRequest(BaseModel):
    name: str | None = None
    status: str | None = None


@router.patch("/leads/{lead_id}")
def update_lead(lead_id: str, req: UpdateLeadRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            ok = crm_repo.update_lead(conn, lead_id=lead_id, name=req.name, status=req.status)
            if not ok:
                raise HTTPException(status_code=404, detail="lead_not_found")
            conn.commit()
            return {"ok": True}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


class Message(BaseModel):
    id: str
    external_id: str
    direction: str
    sender: str | None = None
    body: str | None = None
    created_at: str


@router.get("/conversations/{conversation_id}/messages")
def list_messages(
    conversation_id: str,
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = crm_repo.list_messages(conn, conversation_id=conversation_id, limit=limit)
            messages = [Message(**r.__dict__).model_dump() for r in rows]
            return {"ok": True, "messages": messages}
    except DatabaseNotConfiguredError:
        return {"ok": True, "messages": [], "reason": "database_not_configured"}


class SendConversationTextRequest(BaseModel):
    text: str = Field(min_length=1)
    instance: str | None = Field(default=None, description="Opcional: instância UAZAPI")


@router.post("/conversations/{conversation_id}/send/text")
def send_conversation_text(
    conversation_id: str,
    req: SendConversationTextRequest,
    x_uazapi_token: str | None = Header(default=None, alias="x-uazapi-token"),
    x_uazapi_admintoken: str | None = Header(default=None, alias="x-uazapi-admintoken"),
) -> dict[str, Any]:
    if not (settings.uazapi_base_url and (settings.uazapi_admin_token or settings.uazapi_token or x_uazapi_token or x_uazapi_admintoken)):
        raise HTTPException(status_code=400, detail="uazapi_not_configured")

    try:
        with connect() as conn:
            chatid = crm_repo.get_conversation_external_id(conn, conversation_id=conversation_id)
            if not chatid:
                raise HTTPException(status_code=404, detail="conversation_not_found")

            token = resolve_token(
                settings,
                token=x_uazapi_token,
                instance=req.instance,
                admin_token=x_uazapi_admintoken,
            )
            uaz = client(settings, token=token)

            try:
                upstream = uaz.send_text(number=chatid, text=req.text)
            except UazapiError as exc:
                raise HTTPException(
                    status_code=502,
                    detail={
                        "error": str(exc),
                        "upstream_status": exc.status_code,
                        "upstream_body": exc.body,
                        "upstream_url": exc.url,
                    },
                )

            external_id = crm_repo.store_out_message(conn, conversation_id=conversation_id, text=req.text, raw={"uazapi": upstream})
            conn.commit()
            return {"ok": True, "uazapi": upstream, "stored_external_id": external_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")
