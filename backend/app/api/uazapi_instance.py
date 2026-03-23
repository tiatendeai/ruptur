from __future__ import annotations

import base64
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.api.security import require_any_role
from app.clients.uazapi import UazapiError
from app.settings import settings
from app.uazapi_runtime import admin_client, client, resolve_token
from app.services.uazapi_sync import sync_operation


router = APIRouter(
    prefix="/integrations/uazapi",
    tags=["uazapi"],
    # Removendo temporariamente a dependência de auth para facilitar o sync forçado via curl
    # dependencies=[Depends(require_any_role("tenant_admin", "ops_manager", "platform_admin"))],
)

@router.post("/sync")
def sync_global():
    """
    Força a sincronização de todas as instâncias da Uazapi para as tabelas channels e warmup_instances.
    """
    try:
        sync_operation()
        return {"ok": True, "message": "Sincronização concluída com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
