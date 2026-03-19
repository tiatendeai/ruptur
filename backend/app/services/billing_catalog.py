from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Plan:
    key: str
    name: str
    min_attendants: int
    whatsapp_numbers_included: int
    features: list[str]
    # price per attendant (cents) for each period
    price_cents_annual_per_attendant: int
    price_cents_quarterly_per_attendant: int


PLANS: list[Plan] = [
    Plan(
        key="basic",
        name="Basic",
        min_attendants=2,
        whatsapp_numbers_included=1,
        features=[
            "Inbox e atendimento básico",
            "1 número de WhatsApp",
            "Sem disparos em massa",
            "Sem API/webhooks",
            "Sem construtor de chatbot",
        ],
        price_cents_annual_per_attendant=7890,
        price_cents_quarterly_per_attendant=9900,
    ),
    Plan(
        key="professional",
        name="Profissional",
        min_attendants=2,
        whatsapp_numbers_included=3,
        features=[
            "Inbox + CRM (pipeline) + relatórios",
            "Até 3 números de WhatsApp",
            "Disparos de mensagens em massa",
            "Agendamento e follow-up",
            "Chatbot básico / fluxos (MVP)",
        ],
        price_cents_annual_per_attendant=7890,
        price_cents_quarterly_per_attendant=9900,
    ),
    Plan(
        key="enterprise",
        name="Enterprise",
        min_attendants=2,
        whatsapp_numbers_included=3,
        features=[
            "Tudo do Profissional",
            "Mais números por atendente (add-on)",
            "Construtor de chatbot visual (futuro)",
            "API de integração e webhooks",
            "Log de atividade e auditoria",
        ],
        price_cents_annual_per_attendant=10899,
        price_cents_quarterly_per_attendant=12900,
    ),
]


def get_plan(key: str) -> Plan | None:
    for p in PLANS:
        if p.key == key:
            return p
    return None


def quote_amount_cents(*, plan_key: str, period: str, attendants: int) -> int:
    plan = get_plan(plan_key)
    if not plan:
        raise ValueError("plan_not_found")
    min_att = plan.min_attendants
    qty = max(min_att, attendants)
    if period == "annual":
        per = plan.price_cents_annual_per_attendant
    elif period == "quarterly":
        per = plan.price_cents_quarterly_per_attendant
    else:
        raise ValueError("period_invalid")
    return qty * per

