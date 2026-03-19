from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

import httpx
from fastapi import Depends, Header, HTTPException, Request

from app.settings import settings


PUBLIC_PATHS = {"/health"}
PUBLIC_PREFIXES = ("/webhook/", "/billing/webhook/", "/static/")


@dataclass
class AuthPrincipal:
    id: str
    email: str | None = None
    roles: list[str] = field(default_factory=list)
    kind: str = "user"
    raw: dict[str, Any] = field(default_factory=dict)


def is_public_path(path: str) -> bool:
    return path in PUBLIC_PATHS or any(path.startswith(prefix) for prefix in PUBLIC_PREFIXES)


def _extract_bearer_token(authorization: str | None) -> str | None:
    value = (authorization or "").strip()
    if not value:
        return None
    if not value.lower().startswith("bearer "):
        return None
    token = value[7:].strip()
    return token or None


def _extract_roles(payload: dict[str, Any]) -> list[str]:
    roles: list[str] = []
    for container_key in ("app_metadata", "user_metadata"):
        container = payload.get(container_key)
        if not isinstance(container, dict):
            continue
        value = container.get("roles")
        if isinstance(value, list):
            roles.extend(str(item).strip() for item in value if str(item).strip())
        single_role = container.get("role")
        if isinstance(single_role, str) and single_role.strip():
            roles.append(single_role.strip())
    return sorted(set(roles))


async def _fetch_supabase_user(token: str) -> AuthPrincipal:
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise HTTPException(status_code=503, detail="auth_not_configured")

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    headers = {
        "apikey": settings.supabase_publishable_key,
        "Authorization": f"Bearer {token}",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, headers=headers)

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="unauthorized")
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="auth_upstream_error")

    payload = response.json()
    if not isinstance(payload, dict) or not payload.get("id"):
        raise HTTPException(status_code=401, detail="unauthorized")

    return AuthPrincipal(
        id=str(payload["id"]),
        email=payload.get("email"),
        roles=_extract_roles(payload),
        kind="user",
        raw=payload,
    )


async def authenticate_request(request: Request) -> AuthPrincipal:
    path = request.url.path
    x_jarvis_token = request.headers.get("x-jarvis-token")

    if path.startswith(("/jarvis", "/cfo")) and settings.jarvis_admin_token and x_jarvis_token == settings.jarvis_admin_token:
        return AuthPrincipal(id="jarvis-service", email=None, roles=["platform_admin", "cfo_admin"], kind="service", raw={})

    token = _extract_bearer_token(request.headers.get("authorization"))
    if not token:
        raise HTTPException(status_code=401, detail="unauthorized")
    return await _fetch_supabase_user(token)


async def require_authenticated_user(request: Request) -> AuthPrincipal:
    principal = getattr(request.state, "current_user", None)
    if not isinstance(principal, AuthPrincipal):
        raise HTTPException(status_code=401, detail="unauthorized")
    return principal


def require_any_role(*allowed_roles: str) -> Callable[..., AuthPrincipal]:
    allowed = {role.strip() for role in allowed_roles if role.strip()}

    async def dependency(current_user: AuthPrincipal = Depends(require_authenticated_user)) -> AuthPrincipal:
        if not allowed:
            return current_user
        if current_user.kind == "service":
            return current_user
        if any(role in allowed for role in current_user.roles):
            return current_user
        raise HTTPException(status_code=403, detail="forbidden")

    return dependency


def require_jarvis_token(x_jarvis_token: str | None = Header(default=None, alias="x-jarvis-token")) -> None:
    # Opt-in hardening: when token is unset, keep backward compatibility.
    # When set, every protected route must receive the same header value.
    expected = settings.jarvis_admin_token
    if not expected:
        return
    if x_jarvis_token != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


async def require_jarvis_access(current_user: AuthPrincipal = Depends(require_authenticated_user)) -> AuthPrincipal:
    if current_user.kind == "service":
        return current_user
    if any(role in {"platform_admin", "cfo_admin"} for role in current_user.roles):
        return current_user
    raise HTTPException(status_code=403, detail="forbidden")
