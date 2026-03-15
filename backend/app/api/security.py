from __future__ import annotations

from fastapi import Header, HTTPException

from app.settings import settings


def require_jarvis_token(x_jarvis_token: str | None = Header(default=None, alias="x-jarvis-token")) -> None:
    # Opt-in hardening: when token is unset, keep backward compatibility.
    # When set, every protected route must receive the same header value.
    expected = settings.jarvis_admin_token
    if not expected:
        return
    if x_jarvis_token != expected:
        raise HTTPException(status_code=401, detail="unauthorized")
