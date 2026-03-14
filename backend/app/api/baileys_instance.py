from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query, Response

from app.settings import settings


router = APIRouter(prefix="/integrations/baileys", tags=["baileys"])


def _base_url() -> str:
    return settings.baileys_base_url.rstrip("/")


def _headers(instance: str | None) -> dict[str, str]:
    return {"x-instance-id": (instance or settings.baileys_instance_id or "default").strip()}


def _request(method: str, path: str, *, instance: str | None = None) -> httpx.Response:
    url = f"{_base_url()}{path}"
    with httpx.Client(timeout=20) as client:
        return client.request(method, url, headers=_headers(instance))


@router.get("/instances")
def list_instances() -> dict[str, Any]:
    try:
        resp = _request("GET", "/health")
        resp.raise_for_status()
        data = resp.json()
        return {"ok": True, "items": data.get("instances", [])}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"baileys_instances_unavailable: {exc}")


@router.get("/status")
def status(instance: str | None = Query(default=None)) -> dict[str, Any]:
    try:
        resp = _request("GET", "/instance/status", instance=instance)
        resp.raise_for_status()
        data = resp.json()
        return {"ok": True, "instance": data.get("instance", {})}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"baileys_status_unavailable: {exc}")


@router.post("/connect")
def connect(instance: str | None = Query(default=None)) -> dict[str, Any]:
    try:
        resp = _request("POST", "/instance/connect", instance=instance)
        resp.raise_for_status()
        return {"ok": True, "instance": resp.json().get("instance", {})}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"baileys_connect_unavailable: {exc}")


@router.get("/qrcode.png")
def qrcode_png(instance: str | None = Query(default=None)) -> Response:
    try:
        resp = _request("GET", "/qr.png", instance=instance)
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="qrcode_not_available")
        resp.raise_for_status()
        return Response(content=resp.content, media_type="image/png")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"baileys_qrcode_unavailable: {exc}")
