from __future__ import annotations

import base64
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.clients.uazapi import UazapiError
from app.settings import settings
from app.uazapi_runtime import admin_client, client, resolve_token


router = APIRouter(prefix="/integrations/uazapi", tags=["uazapi"])

SENSITIVE_KEYS = {"token", "admintoken", "apikey", "openai_apikey"}


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            if k in SENSITIVE_KEYS:
                out[k] = "***"
            else:
                out[k] = redact(v)
        return out
    if isinstance(value, list):
        return [redact(v) for v in value]
    return value


class ConnectRequest(BaseModel):
    phone: str | None = Field(
        default=None,
        description="Opcional. Se informado, gera código de pareamento; se omitido, gera QR code.",
    )


class InitInstanceRequest(BaseModel):
    name: str = Field(min_length=1, description="Nome da instância (único)")
    systemName: str | None = Field(default=None, description="Nome do sistema (opcional)")


def _list_single_instance() -> dict[str, Any]:
    if not settings.uazapi_token:
        raise HTTPException(status_code=400, detail="uazapi_admin_not_configured")
    status = client(settings, token=settings.uazapi_token).instance_status()
    instance = status.get("instance") if isinstance(status.get("instance"), dict) else {}
    item = {
        "id": instance.get("id") or "default",
        "name": instance.get("id") or "default",
        "status": instance.get("status") or "unknown",
        "qrcode": instance.get("qrcode") or "",
        "number": instance.get("number") or "",
    }
    return {"ok": True, "uazapi": [redact(item)]}


@router.get("/instances")
def list_instances(
    x_uazapi_admintoken: str | None = Header(default=None, alias="x-uazapi-admintoken"),
) -> dict[str, Any]:
    """
    Lista instâncias (multi-tenant) via admintoken.
    """
    try:
        return {"ok": True, "uazapi": redact(admin_client(settings, admin_token=x_uazapi_admintoken).list_instances())}
    except HTTPException as exc:
        if exc.status_code == 400 and exc.detail == "uazapi_admin_not_configured":
            try:
                return _list_single_instance()
            except UazapiError as upstream_exc:
                raise HTTPException(
                    status_code=502,
                    detail={
                        "error": str(upstream_exc),
                        "upstream_status": upstream_exc.status_code,
                        "upstream_body": upstream_exc.body,
                        "upstream_url": upstream_exc.url,
                    },
                )
        raise
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


@router.post("/instances")
def init_instance(
    req: InitInstanceRequest,
    x_uazapi_admintoken: str | None = Header(default=None, alias="x-uazapi-admintoken"),
) -> dict[str, Any]:
    """
    Cria instância e retorna token (via admintoken).
    """
    try:
        data = admin_client(settings, admin_token=x_uazapi_admintoken).init_instance(name=req.name, system_name=req.systemName)
        return {"ok": True, "uazapi": redact(data)}
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


@router.get("/status")
def status(
    instance: str | None = Query(default=None, description="Opcional: id ou name da instância (resolve token via admin)"),
    x_uazapi_token: str | None = Header(default=None, alias="x-uazapi-token"),
    x_uazapi_admintoken: str | None = Header(default=None, alias="x-uazapi-admintoken"),
) -> dict[str, Any]:
    try:
        token = resolve_token(settings, token=x_uazapi_token, instance=instance, admin_token=x_uazapi_admintoken)
        return {"ok": True, "uazapi": redact(client(settings, token=token).instance_status())}
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


@router.post("/connect")
def connect(
    req: ConnectRequest,
    instance: str | None = Query(default=None, description="Opcional: id ou name da instância (resolve token via admin)"),
    x_uazapi_token: str | None = Header(default=None, alias="x-uazapi-token"),
    x_uazapi_admintoken: str | None = Header(default=None, alias="x-uazapi-admintoken"),
) -> dict[str, Any]:
    try:
        token = resolve_token(settings, token=x_uazapi_token, instance=instance, admin_token=x_uazapi_admintoken)
        return {"ok": True, "uazapi": redact(client(settings, token=token).connect_instance(phone=req.phone))}
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


@router.get("/qrcode.png")
def qrcode_png(
    instance: str | None = Query(default=None, description="Opcional: id ou name da instância (resolve token via admin)"),
    x_uazapi_token: str | None = Header(default=None, alias="x-uazapi-token"),
    x_uazapi_admintoken: str | None = Header(default=None, alias="x-uazapi-admintoken"),
) -> Response:
    """
    Retorna o QR code atual (PNG) quando a instância está em processo de conexão.
    """
    token = resolve_token(settings, token=x_uazapi_token, instance=instance, admin_token=x_uazapi_admintoken)
    try:
        data = client(settings, token=token).instance_status()
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

    instance = data.get("instance") if isinstance(data.get("instance"), dict) else {}
    qrcode = instance.get("qrcode")
    if not isinstance(qrcode, str) or "base64," not in qrcode:
        raise HTTPException(status_code=404, detail="qrcode_not_available")

    b64 = qrcode.split("base64,", 1)[1]
    try:
        png = base64.b64decode(b64)
    except Exception:
        raise HTTPException(status_code=500, detail="qrcode_decode_failed")

    return Response(content=png, media_type="image/png")
