from __future__ import annotations

from fastapi import HTTPException

from app.clients.uazapi import UazapiAdminClient, UazapiClient
from app.settings import Settings


def admin_client(settings: Settings, *, admin_token: str | None = None) -> UazapiAdminClient:
    base = settings.uazapi_base_url
    token = admin_token or settings.uazapi_admin_token
    if not base or not token:
        raise HTTPException(status_code=400, detail="uazapi_admin_not_configured")
    return UazapiAdminClient(base_url=base, admin_token=token)


def resolve_token(
    settings: Settings,
    *,
    token: str | None,
    instance: str | None,
    admin_token: str | None,
) -> str:
    """
    Resolve o token da instância.

    Ordem:
    1) `x-uazapi-token` (direto)
    2) `instance` (id ou name) via admin token (/instance/all)
    3) fallback para `RUPTUR_UAZAPI_TOKEN` (compat com setup single-instance)
    """
    if token:
        return token

    if instance:
        items = admin_client(settings, admin_token=admin_token).list_instances()
        for it in items:
            if str(it.get("id") or "") == instance or str(it.get("name") or "") == instance:
                t = it.get("token")
                if isinstance(t, str) and t.strip():
                    return t.strip()
        raise HTTPException(status_code=404, detail="uazapi_instance_not_found")

    if settings.uazapi_token:
        return settings.uazapi_token

    raise HTTPException(status_code=400, detail="uazapi_not_configured")


def client(settings: Settings, *, token: str) -> UazapiClient:
    if not settings.uazapi_base_url:
        raise HTTPException(status_code=400, detail="uazapi_not_configured")
    return UazapiClient(base_url=settings.uazapi_base_url, token=token)

