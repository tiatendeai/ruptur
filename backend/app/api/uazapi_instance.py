from __future__ import annotations

import base64
from typing import Any

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from app.clients.uazapi import UazapiClient, UazapiError
from app.settings import settings


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


def _client() -> UazapiClient:
    if not settings.uazapi_base_url or not settings.uazapi_token:
        raise HTTPException(status_code=400, detail="uazapi_not_configured")
    return UazapiClient(base_url=settings.uazapi_base_url, token=settings.uazapi_token)


@router.get("/status")
def status() -> dict[str, Any]:
    try:
        return {"ok": True, "uazapi": redact(_client().instance_status())}
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
def connect(req: ConnectRequest) -> dict[str, Any]:
    try:
        return {"ok": True, "uazapi": redact(_client().connect_instance(phone=req.phone))}
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
def qrcode_png() -> Response:
    """
    Retorna o QR code atual (PNG) quando a instância está em processo de conexão.
    """
    try:
        data = _client().instance_status()
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
