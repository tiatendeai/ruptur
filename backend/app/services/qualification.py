from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Qualification:
    status: str
    reason: str


HIGH_INTENT = (
    "preço",
    "preco",
    "valor",
    "quanto",
    "orçamento",
    "orcamento",
    "agendar",
    "agenda",
    "visita",
    "reunião",
    "reuniao",
    "fechar",
    "contratar",
    "pagamento",
)

DISQUALIFY = (
    "não quero",
    "nao quero",
    "pare",
    "parar",
    "stop",
    "spam",
    "remover",
    "cancelar",
)


def qualify_text_v1(text: str | None) -> Qualification | None:
    if not text:
        return None
    t = text.strip().lower()
    if not t:
        return None

    if any(token in t for token in DISQUALIFY):
        return Qualification(status="desqualificado", reason="disqualify_keyword")

    if any(token in t for token in HIGH_INTENT):
        return Qualification(status="qualificado", reason="high_intent_keyword")

    return Qualification(status="contato", reason="default_contact")

