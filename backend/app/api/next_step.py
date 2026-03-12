from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.qualification import qualify_text_v1


router = APIRouter(prefix="/actions", tags=["actions"])


class NextStepRequest(BaseModel):
    text: str = Field(min_length=1, description="Última mensagem do lead")


@router.post("/next-step")
def next_step(req: NextStepRequest) -> dict[str, Any]:
    q = qualify_text_v1(req.text)
    if not q:
        raise HTTPException(status_code=400, detail="no_text")

    if q.status == "desqualificado":
        return {"status": q.status, "reason": q.reason, "suggestion": "Encerrar contato e não responder."}

    if q.status == "qualificado":
        return {
            "status": q.status,
            "reason": q.reason,
            "suggestion": "Oferecer próximo passo: agendar conversa/visita e coletar 2-3 dados essenciais.",
        }

    return {
        "status": q.status,
        "reason": q.reason,
        "suggestion": "Fazer 1 pergunta de qualificação e propor o próximo passo.",
    }

