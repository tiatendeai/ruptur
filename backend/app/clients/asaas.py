from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


class AsaasError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None, body: Any | None = None, url: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body
        self.url = url


@dataclass(frozen=True)
class AsaasConfig:
    base_url: str
    token: str


class AsaasClient:
    def __init__(self, *, config: AsaasConfig) -> None:
        self._base_url = config.base_url.rstrip("/")
        self._token = config.token

    def _headers(self) -> dict[str, str]:
        return {"accept": "application/json", "content-type": "application/json", "access_token": self._token}

    def create_customer(self, *, name: str, email: str | None, mobile_phone: str | None, cpf_cnpj: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"name": name}
        if email:
            payload["email"] = email
        if mobile_phone:
            payload["mobilePhone"] = mobile_phone
        if cpf_cnpj:
            payload["cpfCnpj"] = cpf_cnpj

        return self._post("/v3/customers", payload)

    def create_checkout(
        self,
        *,
        name: str,
        description: str | None,
        billing_types: list[str],
        charge_types: list[str],
        value: float,
        subscription_cycle: str,
        customer: str | None = None,
        due_date_limit_days: int | None = None,
        success_url: str | None = None,
        auto_redirect: bool | None = None,
        expires_in_minutes: int | None = None,
        notification_enabled: bool | None = None,
        callback: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "name": name,
            "billingTypes": billing_types,
            "chargeTypes": charge_types,
            "value": value,
            "subscriptionCycle": subscription_cycle,
        }
        if description:
            payload["description"] = description
        if customer:
            payload["customer"] = customer
        if due_date_limit_days is not None:
            payload["dueDateLimitDays"] = due_date_limit_days
        if success_url:
            payload["successUrl"] = success_url
        if auto_redirect is not None:
            payload["autoRedirect"] = auto_redirect
        if expires_in_minutes is not None:
            payload["expiresInMinutes"] = expires_in_minutes
        if notification_enabled is not None:
            payload["notificationEnabled"] = notification_enabled
        if callback is not None:
            payload["callback"] = callback
        return self._post("/v3/checkouts", payload)

    def get_checkout(self, checkout_id: str) -> dict[str, Any]:
        return self._get(f"/v3/checkouts/{checkout_id}")

    def _get(self, path: str) -> dict[str, Any]:
        url = f"{self._base_url}{path}"
        with httpx.Client(timeout=20) as http:
            r = http.get(url, headers=self._headers())
            if r.status_code >= 400:
                raise AsaasError("Asaas request failed", status_code=r.status_code, body=_safe_json(r), url=url)
            return r.json()

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self._base_url}{path}"
        with httpx.Client(timeout=20) as http:
            r = http.post(url, headers=self._headers(), json=payload)
            if r.status_code >= 400:
                raise AsaasError("Asaas request failed", status_code=r.status_code, body=_safe_json(r), url=url)
            return r.json()


def _safe_json(resp: httpx.Response) -> Any:
    try:
        return resp.json()
    except Exception:
        return resp.text

