from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.clients.uazapi import UazapiClient
from app.settings import settings


router = APIRouter(prefix="/send", tags=["send"])


class SendTextRequest(BaseModel):
    number: str = Field(description="ChatID ou número (formato aceito pela uazapi)")
    text: str = Field(min_length=1)


@router.post("/text")
def send_text(req: SendTextRequest) -> dict[str, Any]:
    if not settings.uazapi_base_url or not settings.uazapi_token:
        raise HTTPException(status_code=400, detail="uazapi_not_configured")

    client = UazapiClient(base_url=settings.uazapi_base_url, token=settings.uazapi_token)
    resp = client.send_text(number=req.number, text=req.text)
    return {"ok": True, "uazapi": resp}

