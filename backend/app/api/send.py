from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from app.clients.uazapi import UazapiError
from app.settings import settings
from app.uazapi_runtime import client, resolve_token


router = APIRouter(prefix="/send", tags=["send"])


class SendTextRequest(BaseModel):
    number: str = Field(description="ChatID ou número (formato aceito pela uazapi)")
    text: str = Field(min_length=1)

    @field_validator("number")
    @classmethod
    def validate_number(cls, value: str) -> str:
        v = value.strip()
        if not v:
            raise ValueError("number is required")
        if any(ch.isspace() for ch in v):
            raise ValueError("number must not contain whitespace")
        return v


@router.post("/text")
def send_text(
    req: SendTextRequest,
    instance: str | None = Query(default=None, description="Opcional: id ou name da instância (resolve token via admin)"),
    x_uazapi_token: str | None = Header(default=None, alias="x-uazapi-token"),
    x_uazapi_admintoken: str | None = Header(default=None, alias="x-uazapi-admintoken"),
) -> dict[str, Any]:
    token = resolve_token(settings, token=x_uazapi_token, instance=instance, admin_token=x_uazapi_admintoken)
    uaz = client(settings, token=token)
    try:
        resp = uaz.send_text(number=req.number, text=req.text)
        return {"ok": True, "uazapi": resp}
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
