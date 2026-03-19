from __future__ import annotations

from typing import Any

<<<<<<< HEAD
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.clients.uazapi import UazapiClient, UazapiError
from app.settings import settings
=======
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

from app.clients.uazapi import UazapiError
from app.settings import settings
from app.uazapi_runtime import client, resolve_token
>>>>>>> work


router = APIRouter(prefix="/send", tags=["send"])

<<<<<<< HEAD
=======
def _br_variants(number: str) -> list[str]:
    digits = "".join(ch for ch in number if ch.isdigit())
    if not digits.startswith("55"):
        return [digits] if digits else []
    if len(digits) == 12:
        return [digits, f"{digits[:4]}9{digits[4:]}"]
    if len(digits) == 13 and digits[4] == "9":
        return [digits, f"{digits[:4]}{digits[5:]}"]
    return [digits]


def _resolve_number_via_uazapi(uaz, number: str) -> str:
    # If caller already passed chatid/jid/group, don't touch it.
    if "@" in number:
        return number
    candidates = _br_variants(number) or [number]
    results = uaz.chat_check(numbers=candidates)
    for item in results:
        if item.get("isInWhatsapp") and isinstance(item.get("jid"), str) and item.get("jid"):
            return item["jid"]
    return number

>>>>>>> work

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
<<<<<<< HEAD
def send_text(req: SendTextRequest) -> dict[str, Any]:
    if not settings.uazapi_base_url or not settings.uazapi_token:
        raise HTTPException(status_code=400, detail="uazapi_not_configured")

    client = UazapiClient(base_url=settings.uazapi_base_url, token=settings.uazapi_token)
    try:
        resp = client.send_text(number=req.number, text=req.text)
=======
def send_text(
    req: SendTextRequest,
    instance: str | None = Query(default=None, description="Opcional: id ou name da instância (resolve token via admin)"),
    x_uazapi_token: str | None = Header(default=None, alias="x-uazapi-token"),
    x_uazapi_admintoken: str | None = Header(default=None, alias="x-uazapi-admintoken"),
    resolve: bool = Query(default=True, description="Se true, resolve número via /chat/check (mitiga 9º dígito no BR)."),
) -> dict[str, Any]:
    token = resolve_token(settings, token=x_uazapi_token, instance=instance, admin_token=x_uazapi_admintoken)
    uaz = client(settings, token=token)
    try:
        number = _resolve_number_via_uazapi(uaz, req.number) if resolve else req.number
        resp = uaz.send_text(number=number, text=req.text)
>>>>>>> work
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
