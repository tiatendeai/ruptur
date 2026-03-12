from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.clients.uazapi import UazapiClient, UazapiError
from app.settings import settings


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
def send_text(req: SendTextRequest) -> dict[str, Any]:
    if not settings.uazapi_base_url or not settings.uazapi_token:
        raise HTTPException(status_code=400, detail="uazapi_not_configured")

    client = UazapiClient(base_url=settings.uazapi_base_url, token=settings.uazapi_token)
    try:
        resp = client.send_text(number=req.number, text=req.text)
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
