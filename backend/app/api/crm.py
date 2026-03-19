from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.clients.baileys import BaileysClient
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
    last_message_direction: str | None = None
    labels: list[str] = Field(default_factory=list)
    assignee_name: str | None = None
    assignee_team: str | None = None
    paused: bool = False
    manual_override: bool = False
    queue_state: str = "active"


class Label(BaseModel):
    key: str = Field(min_length=1)
    name: str = Field(min_length=1)
    color: str = Field(min_length=1)


class CreateLabelRequest(BaseModel):
    key: str = Field(min_length=1)
    name: str = Field(min_length=1)
    color: str = Field(default="sand", min_length=1)


class SetLeadLabelsRequest(BaseModel):
    labels: list[str] = Field(default_factory=list)


class AssignLeadRequest(BaseModel):
    owner_name: str | None = None
    team: str | None = None


class UpdateLeadAutomationStateRequest(BaseModel):
    paused: bool | None = None
    manual_override: bool | None = None


class SavedView(BaseModel):
    id: str
    scope: str
    name: str = Field(min_length=1)
    definition: dict[str, Any] = Field(default_factory=dict)
    position: int = 0
    is_shared: bool = True


class QueueSummaryItem(BaseModel):
    key: str
    total: int = 0


class CreateSavedViewRequest(BaseModel):
    scope: str = Field(default="inbox", min_length=1)
    name: str = Field(min_length=1)
    definition: dict[str, Any] = Field(default_factory=dict)
    position: int = 0
    is_shared: bool = True


class QueuesSummary(BaseModel):
    total: int
    by_queue: dict[str, int]
    with_conversation: int


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


@router.get("/labels")
def list_labels() -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = crm_repo.list_labels(conn)
            return {"ok": True, "labels": [Label(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "labels": [], "reason": "database_not_configured"}


@router.get("/queues/summary")
def get_queues_summary() -> dict[str, Any]:
    try:
        with connect() as conn:
            leads = crm_repo.list_leads(conn, limit=1000)
            summary = {
                "total": len(leads),
                "by_queue": {},
                "with_conversation": sum(1 for l in leads if l.conversation_id)
            }
            for l in leads:
                state = l.queue_state
                summary["by_queue"][state] = summary["by_queue"].get(state, 0) + 1
            
            return {"ok": True, "summary": summary}
    except DatabaseNotConfiguredError:
        return {"ok": True, "summary": {"total": 0, "by_queue": {}, "with_conversation": 0}, "reason": "database_not_configured"}


@router.post("/labels")
def create_label(req: CreateLabelRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            crm_repo.create_label(conn, key=req.key, name=req.name, color=req.color)
            conn.commit()
            return {"ok": True}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


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


@router.patch("/leads/{lead_id}/labels")
def set_lead_labels(lead_id: str, req: SetLeadLabelsRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            ok = crm_repo.set_lead_labels(conn, lead_id=lead_id, label_keys=req.labels)
            if not ok:
                raise HTTPException(status_code=404, detail="lead_not_found")
            conn.commit()
            return {"ok": True}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


@router.patch("/leads/{lead_id}/assign")
def assign_lead(lead_id: str, req: AssignLeadRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            ok = crm_repo.assign_lead(conn, lead_id=lead_id, owner_name=req.owner_name, team=req.team)
            if not ok:
                raise HTTPException(status_code=404, detail="lead_not_found")
            conn.commit()
            return {"ok": True}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


@router.patch("/leads/{lead_id}/automation")
def update_lead_automation_state(lead_id: str, req: UpdateLeadAutomationStateRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            ok = crm_repo.set_lead_automation_state(
                conn,
                lead_id=lead_id,
                paused=req.paused,
                manual_override=req.manual_override,
            )
            if not ok:
                raise HTTPException(status_code=404, detail="lead_not_found")
            conn.commit()
            return {"ok": True}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


@router.get("/views")
def list_saved_views(scope: str = Query(default="inbox")) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = crm_repo.list_saved_views(conn, scope=scope)
            return {"ok": True, "views": [SavedView(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "views": [], "reason": "database_not_configured"}


@router.get("/queues/summary")
def get_queue_summary() -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = crm_repo.queue_summary(conn)
            return {"ok": True, "items": [QueueSummaryItem(**r.__dict__).model_dump() for r in rows]}
    except DatabaseNotConfiguredError:
        return {"ok": True, "items": [], "reason": "database_not_configured"}


@router.post("/views")
def create_saved_view(req: CreateSavedViewRequest) -> dict[str, Any]:
    try:
        with connect() as conn:
            view_id = crm_repo.create_saved_view(
                conn,
                scope=req.scope,
                name=req.name,
                definition=req.definition,
                position=req.position,
                is_shared=req.is_shared,
            )
            conn.commit()
            return {"ok": True, "id": view_id}
    except DatabaseNotConfiguredError:
        raise HTTPException(status_code=503, detail="database_not_configured")


class Message(BaseModel):
    id: str
    external_id: str
    direction: str
    sender: str | None = None
    body: str | None = None
    created_at: str
    kind: str = "text"
    mime_type: str | None = None
    media_url: str | None = None
    file_name: str | None = None
    caption: str | None = None
    delivery_status: str = "unknown"


class ContactProfileImagesRequest(BaseModel):
    numbers: list[str] = Field(default_factory=list)
    preview: bool = True
    provider: str | None = Field(default=None, description="auto|uazapi|baileys")
    instance: str | None = Field(default=None, description="Instancia opcional do provider")


def _digits_only(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _raw_candidates(raw: dict[str, Any]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    if isinstance(raw, dict):
        items.append(raw)
        data = raw.get("data")
        if isinstance(data, dict):
            items.append(data)
        upstream = raw.get("uazapi")
        if isinstance(upstream, dict):
            items.append(upstream)
    return items


def _first_str(payloads: list[dict[str, Any]], keys: tuple[str, ...]) -> str | None:
    for payload in payloads:
        for key in keys:
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return None


def _first_int(payloads: list[dict[str, Any]], keys: tuple[str, ...]) -> int | None:
    for payload in payloads:
        for key in keys:
            value = payload.get(key)
            if isinstance(value, bool):
                continue
            if isinstance(value, int):
                return value
            if isinstance(value, str) and value.strip().isdigit():
                return int(value.strip())
    return None


def _detect_message_kind(raw: dict[str, Any], body: str | None) -> tuple[str, str | None]:
    payloads = _raw_candidates(raw)
    message_type = (_first_str(payloads, ("type", "messageType", "message_type", "mediaType", "media_type")) or "").lower()
    mime_type = _first_str(payloads, ("mimetype", "mimeType", "mime_type", "fileMimetype"))
    signature = " ".join(filter(None, [message_type, (mime_type or "").lower(), (body or "").lower()]))

    kind_map = [
        ("ptt", "ptt"),
        ("voice", "ptt"),
        ("audio", "audio"),
        ("image", "image"),
        ("video", "video"),
        ("document", "document"),
        ("file", "document"),
        ("sticker", "sticker"),
        ("location", "location"),
        ("contact", "contact"),
        ("link", "link"),
    ]
    for token, kind in kind_map:
        if token in signature:
            return kind, mime_type

    if "[áudio transcrito]" in (body or "").lower():
        return "ptt", mime_type or "audio/mpeg"

    if _first_str(payloads, ("imageUrl", "image", "imagePreview", "mediaUrl", "media_url", "url")):
        return "image", mime_type

    return "text", mime_type


def _detect_media_url(raw: dict[str, Any], kind: str) -> str | None:
    payloads = _raw_candidates(raw)
    preferred_keys = {
        "image": ("imageUrl", "image", "imagePreview", "mediaUrl", "media_url", "url"),
        "video": ("videoUrl", "video", "mediaUrl", "media_url", "url"),
        "audio": ("audioUrl", "audio", "mediaUrl", "media_url", "url"),
        "ptt": ("audioUrl", "audio", "voiceUrl", "mediaUrl", "media_url", "url"),
        "document": ("documentUrl", "document", "mediaUrl", "media_url", "url"),
    }
    url = _first_str(payloads, preferred_keys.get(kind, ("mediaUrl", "media_url", "url")))
    if url and (url.startswith("http://") or url.startswith("https://") or url.startswith("data:")):
        return url
    return None


def _detect_file_name(raw: dict[str, Any]) -> str | None:
    return _first_str(_raw_candidates(raw), ("fileName", "filename", "docName", "displayName", "title"))


def _detect_caption(raw: dict[str, Any], body: str | None, kind: str) -> str | None:
    caption = _first_str(_raw_candidates(raw), ("caption", "text", "content"))
    if kind == "text":
        return None
    if caption and caption != body:
        return caption
    return None


def _detect_delivery_status(raw: dict[str, Any], direction: str) -> str:
    payloads = _raw_candidates(raw)

    for payload in payloads:
        ok_value = payload.get("ok")
        if ok_value is False:
            return "failed"
        error_value = payload.get("error")
        if isinstance(error_value, str) and error_value.strip():
            return "failed"

    ack = _first_int(payloads, ("ack", "status", "messageStatus", "message_status"))
    if ack is not None:
        if ack >= 3:
            return "read"
        if ack == 2:
            return "delivered"
        if ack >= 1:
            return "sent"

    if direction == "out":
        for payload in payloads:
            if payload.get("processed_by") == "jarvis_ai":
                return "sent"
            if isinstance(payload.get("uazapi"), dict) or any(k in payload for k in ("serverId", "messageId", "id", "msgId")):
                return "sent"

    return "unknown"


def _serialize_message(row: crm_repo.MessageRow) -> Message:
    raw = row.raw or {}
    kind, mime_type = _detect_message_kind(raw, row.body)
    return Message(
        id=row.id,
        external_id=row.external_id,
        direction=row.direction,
        sender=row.sender,
        body=row.body,
        created_at=row.created_at,
        kind=kind,
        mime_type=mime_type,
        media_url=_detect_media_url(raw, kind),
        file_name=_detect_file_name(raw),
        caption=_detect_caption(raw, row.body, kind),
        delivery_status=_detect_delivery_status(raw, row.direction),
    )


def _resolve_avatar_provider(preferred: str | None) -> str:
    normalized = (preferred or "auto").strip().lower()
    if normalized in {"uazapi", "baileys"}:
        return normalized
    if settings.uazapi_base_url and (settings.uazapi_admin_token or settings.uazapi_token):
        return "uazapi"
    if settings.baileys_base_url:
        return "baileys"
    raise HTTPException(status_code=400, detail="avatar_provider_not_configured")


def _fetch_contact_profile_image(
    *,
    number: str,
    preview: bool,
    provider: str,
    instance: str | None,
    x_uazapi_token: str | None,
    x_uazapi_admintoken: str | None,
) -> dict[str, Any]:
    if provider == "uazapi":
        token = resolve_token(
            settings,
            token=x_uazapi_token,
            instance=instance,
            admin_token=x_uazapi_admintoken,
        )
        details = client(settings, token=token).chat_details(number=number, preview=preview)
        return {
            "imageUrl": details.get("imagePreview") or details.get("image") or details.get("profilePicUrl") or None,
            "name": details.get("wa_contactName") or details.get("wa_name") or details.get("name") or None,
            "jid": details.get("wa_chatid") or None,
        }

    resolved_instance = str(instance or "").strip()
    if not resolved_instance or resolved_instance.lower() == "default":
        try:
            with httpx.Client(timeout=10) as client_http:
                resp = client_http.get(f"{settings.baileys_base_url.rstrip('/')}/health")
                resp.raise_for_status()
                data = resp.json()
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"baileys_instance_lookup_failed: {exc}")

        resolved_instance = ""
        for item in data.get("instances", []) or []:
            if not isinstance(item, dict):
                continue
            candidate = str(item.get("instance") or item.get("id") or item.get("name") or "").strip()
            if candidate and candidate.lower() != "default" and str(item.get("connection") or "").lower() == "open":
                resolved_instance = candidate
                break
        if not resolved_instance:
            for item in data.get("instances", []) or []:
                if not isinstance(item, dict):
                    continue
                candidate = str(item.get("instance") or item.get("id") or item.get("name") or "").strip()
                if candidate and candidate.lower() != "default":
                    resolved_instance = candidate
                    break
        if not resolved_instance:
            raise HTTPException(status_code=400, detail="baileys_instance_required")

    details = BaileysClient(
        base_url=settings.baileys_base_url,
        instance_id=resolved_instance,
    ).chat_details(number=number, preview=preview)
    if not details.get("ok", True):
        raise HTTPException(status_code=502, detail=f"baileys_avatar_unavailable: {details.get('error') or 'unknown_error'}")
    return {
        "imageUrl": details.get("imagePreview") or details.get("image") or None,
        "name": details.get("wa_contactName") or details.get("wa_name") or details.get("name") or None,
        "jid": details.get("wa_chatid") or None,
    }


@router.get("/conversations/{conversation_id}/messages")
def list_messages(
    conversation_id: str,
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    try:
        with connect() as conn:
            rows = crm_repo.list_messages(conn, conversation_id=conversation_id, limit=limit)
            messages = [_serialize_message(r).model_dump() for r in rows]
            return {"ok": True, "messages": messages}
    except DatabaseNotConfiguredError:
        return {"ok": True, "messages": [], "reason": "database_not_configured"}


@router.post("/contacts/profile-images")
def contact_profile_images(
    req: ContactProfileImagesRequest,
    x_uazapi_token: str | None = Header(default=None, alias="x-uazapi-token"),
    x_uazapi_admintoken: str | None = Header(default=None, alias="x-uazapi-admintoken"),
) -> dict[str, Any]:
    provider = _resolve_avatar_provider(req.provider)
    seen: set[str] = set()
    items: list[dict[str, Any]] = []

    for raw in req.numbers:
        number = _digits_only(raw)
        if not number or number in seen:
            continue
        seen.add(number)
        try:
            profile = _fetch_contact_profile_image(
                number=number,
                preview=req.preview,
                provider=provider,
                instance=req.instance,
                x_uazapi_token=x_uazapi_token,
                x_uazapi_admintoken=x_uazapi_admintoken,
            )
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
        except HTTPException:
            raise
        except Exception:
            profile = {"imageUrl": None, "name": None, "jid": None}

        items.append(
            {
                "number": number,
                "imageUrl": profile.get("imageUrl"),
                "name": profile.get("name"),
                "jid": profile.get("jid"),
            }
        )

    return {"ok": True, "provider": provider, "items": items}


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
