from __future__ import annotations

import re
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.api.security import require_any_role
from app.settings import settings


router = APIRouter(
    prefix="/integrations/baileys",
    tags=["baileys"],
    dependencies=[Depends(require_any_role("tenant_admin", "ops_manager", "platform_admin"))],
)

LEGACY_INSTANCE_BY_CANONICAL = {
    "inst-5531989131980": "inst-553189131980",
    "inst-5531981139540": "inst-553181139540",
}


class CreateInstanceRequest(BaseModel):
    instance: str = Field(min_length=1, description="ID da instância Baileys")
    profileName: str | None = Field(default=None, description="Nome operacional exibido no painel")
    systemName: str | None = Field(default=None, description="Sistema/dono operacional da instância")
    adminField01: str | None = Field(default=None, description="Campo administrativo livre 01")
    adminField02: str | None = Field(default=None, description="Campo administrativo livre 02")
    browser: str | None = Field(default=None, description="User agent do companion no formato Nome|Dispositivo|Versão")
    syncFullHistory: bool | None = Field(default=None, description="Sincroniza histórico completo do multi-device")
    markOnlineOnConnect: bool | None = Field(default=None, description="Expõe presença online ao conectar")


def _base_url() -> str:
    return settings.baileys_base_url.rstrip("/")


def _digits_only(value: str | None) -> str:
    return "".join(ch for ch in str(value or "") if ch.isdigit())


def _canonical_br_msisdn(value: str | None) -> str:
    digits = _digits_only(value)
    if digits.startswith("55") and len(digits) == 12 and digits[4] in {"6", "7", "8", "9"}:
        return f"{digits[:4]}9{digits[4:]}"
    return digits


def _clean_instance(value: str | None) -> str:
    instance = (value or "").strip()
    if instance.lower() == "default":
        return ""
    return instance


def _instance_canonical_id(value: str | None) -> str:
    instance = _clean_instance(value)
    if not instance:
        return ""
    match = re.search(r"(\d{10,15})", instance)
    if not match:
        return instance
    msisdn = _canonical_br_msisdn(match.group(1))
    if not msisdn:
        return instance
    return f"inst-{msisdn}"


def _instance_msisdn(value: str | None) -> str | None:
    canonical_id = _instance_canonical_id(value)
    match = re.search(r"(\d{10,15})", canonical_id)
    if not match:
        return None
    return match.group(1)


def _resolve_instance_alias(value: str | None) -> str:
    instance = _clean_instance(value)
    if not instance:
        raise HTTPException(status_code=400, detail="baileys_instance_required")
    if instance in LEGACY_INSTANCE_BY_CANONICAL:
        return LEGACY_INSTANCE_BY_CANONICAL[instance]
    canonical_id = _instance_canonical_id(instance)
    return LEGACY_INSTANCE_BY_CANONICAL.get(canonical_id, instance)


def _decorate_instance(item: dict[str, Any]) -> dict[str, Any]:
    out = dict(item or {})
    instance = _clean_instance(str(out.get("instance") or out.get("id") or out.get("name") or ""))
    canonical_id = _instance_canonical_id(instance)
    out["instance"] = instance
    out["instance_effective"] = instance
    out["instance_canonical"] = canonical_id
    out["instance_display"] = canonical_id or instance
    out["number_canonical"] = _instance_msisdn(instance)
    return out


def _headers(instance: str | None) -> dict[str, str]:
    cleaned = _clean_instance(instance)
    if not cleaned:
        return {}
    return {"x-instance-id": _resolve_instance_alias(cleaned)}


def _request(method: str, path: str, *, instance: str | None = None, payload: dict[str, Any] | None = None) -> httpx.Response:
    url = f"{_base_url()}{path}"
    with httpx.Client(timeout=20) as client:
        return client.request(method, url, headers=_headers(instance), json=payload)


@router.get("/instances")
def list_instances() -> dict[str, Any]:
    try:
        resp = _request("GET", "/health")
        resp.raise_for_status()
        data = resp.json()
        items = [_decorate_instance(i) for i in (data.get("instances", []) or []) if isinstance(i, dict)]
        return {"ok": True, "items": items}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"baileys_instances_unavailable: {exc}")


@router.post("/instances")
def create_instance(req: CreateInstanceRequest) -> dict[str, Any]:
    try:
        requested = _clean_instance(req.instance)
        if not requested:
            raise HTTPException(status_code=400, detail="baileys_instance_required")
        payload = req.model_dump(exclude_none=True)
        resp = _request("POST", "/instance", instance=requested, payload=payload)
        resp.raise_for_status()
        raw = resp.json().get("instance", {})
        if not isinstance(raw, dict):
            raw = {}
        decorated = _decorate_instance(raw)
        decorated["instance_requested"] = requested
        return {"ok": True, "instance": decorated}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"baileys_create_unavailable: {exc}")


@router.delete("/instances")
def delete_instance(instance: str | None = Query(default=None)) -> dict[str, Any]:
    try:
        requested = _clean_instance(instance)
        if not requested:
            raise HTTPException(status_code=400, detail="baileys_instance_required")
        resp = _request("DELETE", "/instance", instance=requested)
        resp.raise_for_status()
        raw = resp.json().get("instance", {})
        if not isinstance(raw, dict):
            raw = {"id": _resolve_instance_alias(requested), "status": "deleted", "deleted": True}
        decorated = _decorate_instance(raw)
        decorated["instance_requested"] = requested
        return {"ok": True, "instance": decorated}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"baileys_delete_unavailable: {exc}")


@router.get("/status")
def status(instance: str | None = Query(default=None)) -> dict[str, Any]:
    try:
        requested = _clean_instance(instance)
        if not requested:
            raise HTTPException(status_code=400, detail="baileys_instance_required")
        resp = _request("GET", "/instance/status", instance=requested)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="baileys_instance_not_found")
        resp.raise_for_status()
        data = resp.json()
        raw = data.get("instance", {})
        if not isinstance(raw, dict):
            raw = {}
        decorated = _decorate_instance(raw)
        decorated["instance_requested"] = requested
        return {"ok": True, "instance": decorated}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"baileys_status_unavailable: {exc}")


@router.post("/connect")
def connect(instance: str | None = Query(default=None)) -> dict[str, Any]:
    try:
        requested = _clean_instance(instance)
        if not requested:
            raise HTTPException(status_code=400, detail="baileys_instance_required")
        resp = _request("POST", "/instance/connect", instance=requested)
        resp.raise_for_status()
        raw = resp.json().get("instance", {})
        if not isinstance(raw, dict):
            raw = {}
        decorated = _decorate_instance(raw)
        decorated["instance_requested"] = requested
        return {"ok": True, "instance": decorated}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"baileys_connect_unavailable: {exc}")


@router.post("/reset")
def reset(instance: str | None = Query(default=None)) -> dict[str, Any]:
    try:
        requested = _clean_instance(instance)
        if not requested:
            raise HTTPException(status_code=400, detail="baileys_instance_required")
        resp = _request("POST", "/instance/reset", instance=requested)
        resp.raise_for_status()
        raw = resp.json().get("instance", {})
        if not isinstance(raw, dict):
            raw = {}
        decorated = _decorate_instance(raw)
        decorated["instance_requested"] = requested
        return {"ok": True, "instance": decorated}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"baileys_reset_unavailable: {exc}")


@router.get("/qrcode.png")
def qrcode_png(instance: str | None = Query(default=None)) -> Response:
    try:
        requested = _clean_instance(instance)
        if not requested:
            raise HTTPException(status_code=400, detail="baileys_instance_required")
        resp = _request("GET", "/qr.png", instance=requested)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="qrcode_not_available")
        resp.raise_for_status()
        return Response(content=resp.content, media_type="image/png")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"baileys_qrcode_unavailable: {exc}")
