from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from psycopg.types.json import Jsonb

from app.clients.asaas import AsaasClient, AsaasConfig, AsaasError
from app.db import DatabaseNotConfiguredError, connect
from app.services.billing_catalog import PLANS, get_plan, quote_amount_cents
from app.settings import settings


router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans")
def list_plans() -> dict[str, Any]:
    return {
        "ok": True,
        "plans": [
            {
                "key": p.key,
                "name": p.name,
                "minAttendants": p.min_attendants,
                "whatsappNumbersIncluded": p.whatsapp_numbers_included,
                "features": p.features,
                "priceCentsAnnualPerAttendant": p.price_cents_annual_per_attendant,
                "priceCentsQuarterlyPerAttendant": p.price_cents_quarterly_per_attendant,
            }
            for p in PLANS
        ],
    }


class QuoteRequest(BaseModel):
    plan_key: str = Field(min_length=1)
    period: str = Field(default="annual", description="annual|quarterly")
    attendants: int = Field(default=2, ge=1, le=999)


@router.post("/quote")
def quote(req: QuoteRequest) -> dict[str, Any]:
    try:
        amount_cents = quote_amount_cents(plan_key=req.plan_key, period=req.period, attendants=req.attendants)
        plan = get_plan(req.plan_key)
        if not plan:
            raise ValueError("plan_not_found")
        return {
            "ok": True,
            "amountCents": amount_cents,
            "currency": "BRL",
            "attendantsBilled": max(plan.min_attendants, req.attendants),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


class CheckoutRequest(BaseModel):
    plan_key: str = Field(min_length=1)
    period: str = Field(default="annual", description="annual|quarterly")
    attendants: int = Field(default=2, ge=1, le=999)
    company_name: str = Field(min_length=1)
    email: str | None = None
    phone: str | None = None
    success_url: str | None = Field(default=None, description="URL para redirecionar após pagamento (opcional)")


@router.post("/checkout")
def create_checkout(req: CheckoutRequest) -> dict[str, Any]:
    if not settings.asaas_token:
        raise HTTPException(status_code=400, detail="asaas_not_configured")

    plan = get_plan(req.plan_key)
    if not plan:
        raise HTTPException(status_code=404, detail="plan_not_found")

    attendants = max(plan.min_attendants, req.attendants)
    amount_cents = quote_amount_cents(plan_key=req.plan_key, period=req.period, attendants=attendants)

    # For checkout we charge a recurring subscription amount as "value".
    value_brl = round(amount_cents / 100.0, 2)
    subscription_cycle = "YEARLY" if req.period == "annual" else "QUARTERLY"

    asaas = AsaasClient(config=AsaasConfig(base_url=settings.asaas_base_url, token=settings.asaas_token))

    try:
        checkout = asaas.create_checkout(
            name=f"Ruptur {plan.name}",
            description=f"{plan.name} ({attendants} atendentes) - {req.period}",
            billing_types=["CREDIT_CARD"],
            charge_types=["RECURRENT"],
            value=value_brl,
            subscription_cycle=subscription_cycle,
            success_url=req.success_url,
            auto_redirect=True if req.success_url else None,
            notification_enabled=True,
            callback={"successUrl": req.success_url} if req.success_url else None,
        )
    except AsaasError as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": str(exc), "upstream_status": exc.status_code, "upstream_body": exc.body, "upstream_url": exc.url},
        )

    external_id = str(checkout.get("id") or "")
    checkout_url = checkout.get("link") or checkout.get("checkoutUrl") or checkout.get("url")

    if not external_id:
        raise HTTPException(status_code=502, detail={"error": "asaas_checkout_missing_id", "upstream": checkout})

    try:
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO billing_checkouts
                  (provider, external_id, status, plan_key, period, attendants, amount_cents, company_name, email, phone, updated_at)
                VALUES
                  ('asaas', %s, 'active', %s, %s, %s, %s, %s, %s, %s, now())
                ON CONFLICT (provider, external_id) DO UPDATE
                  SET updated_at = now()
                """,
                (external_id, req.plan_key, req.period, attendants, amount_cents, req.company_name, req.email, req.phone),
            )
            conn.commit()
    except DatabaseNotConfiguredError:
        # allow checkout even without DB for early preview; just return the URL
        pass

    return {
        "ok": True,
        "provider": "asaas",
        "checkoutId": external_id,
        "checkoutUrl": checkout_url,
        "amountCents": amount_cents,
        "currency": "BRL",
        "attendantsBilled": attendants,
        "note": "Use o checkoutUrl para abrir o pagamento. Webhook do Asaas deve atualizar status no Ruptur.",
    }


@router.post("/webhook/asaas")
async def asaas_webhook(request: Request) -> dict[str, Any]:
    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="payload_must_be_object")

    event_type = str(payload.get("event") or payload.get("type") or "unknown")
    external_id = None
    if isinstance(payload.get("checkout"), dict) and payload["checkout"].get("id"):
        external_id = str(payload["checkout"]["id"])
    elif isinstance(payload.get("payment"), dict) and payload["payment"].get("id"):
        external_id = str(payload["payment"]["id"])

    # Store raw for audit
    try:
        with connect() as conn:
            conn.execute(
                "INSERT INTO billing_events (provider, event_type, external_id, payload) VALUES ('asaas', %s, %s, %s)",
                (event_type, external_id, Jsonb(payload)),
            )

            # Best-effort status update for checkouts
            if external_id and event_type.upper().startswith("CHECKOUT_"):
                status_map = {
                    "CHECKOUT_PAID": "paid",
                    "CHECKOUT_CANCELED": "canceled",
                    "CHECKOUT_EXPIRED": "expired",
                }
                new_status = status_map.get(event_type.upper())
                if new_status:
                    conn.execute(
                        "UPDATE billing_checkouts SET status=%s, updated_at=now() WHERE provider='asaas' AND external_id=%s",
                        (new_status, external_id),
                    )
            conn.commit()
    except DatabaseNotConfiguredError:
        return {"ok": True, "stored": False, "reason": "database_not_configured"}

    return {"ok": True, "stored": True}

