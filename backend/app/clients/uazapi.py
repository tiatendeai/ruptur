from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


class UazapiNotConfiguredError(RuntimeError):
    pass


class UazapiError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        body: str | None = None,
        url: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.body = body
        self.url = url


@dataclass(frozen=True)
class UazapiClient:
    base_url: str
    token: str

    def _headers(self) -> dict[str, str]:
        return {"token": self.token}

    def send_text(self, *, number: str, text: str) -> dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/send/text"
        payload = {"number": number, "text": text}
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(url, json=payload, headers=self._headers())
        except httpx.TimeoutException as exc:
            raise UazapiError("uazapi_timeout", url=url) from exc
        except httpx.RequestError as exc:
            raise UazapiError("uazapi_request_error", url=url) from exc

        if resp.is_error:
            body = (resp.text or "")[:2000]
            raise UazapiError(
                "uazapi_http_error",
                status_code=resp.status_code,
                body=body,
                url=str(resp.request.url),
            )

        try:
            data = resp.json()
        except Exception:
            return {"raw": resp.text}

        if not isinstance(data, dict):
            return {"raw": data}
        return data

    def instance_status(self) -> dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/instance/status"
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.get(url, headers=self._headers())
        except httpx.TimeoutException as exc:
            raise UazapiError("uazapi_timeout", url=url) from exc
        except httpx.RequestError as exc:
            raise UazapiError("uazapi_request_error", url=url) from exc

        if resp.is_error:
            body = (resp.text or "")[:2000]
            raise UazapiError(
                "uazapi_http_error",
                status_code=resp.status_code,
                body=body,
                url=str(resp.request.url),
            )

        try:
            data = resp.json()
        except Exception:
            return {"raw": resp.text}
        return data if isinstance(data, dict) else {"raw": data}

    def connect_instance(self, *, phone: str | None = None) -> dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/instance/connect"
        payload: dict[str, Any] = {}
        if phone:
            payload["phone"] = phone

        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(url, json=payload or None, headers=self._headers())
        except httpx.TimeoutException as exc:
            raise UazapiError("uazapi_timeout", url=url) from exc
        except httpx.RequestError as exc:
            raise UazapiError("uazapi_request_error", url=url) from exc

        if resp.is_error:
            body = (resp.text or "")[:2000]
            raise UazapiError(
                "uazapi_http_error",
                status_code=resp.status_code,
                body=body,
                url=str(resp.request.url),
            )

        try:
            data = resp.json()
        except Exception:
            return {"raw": resp.text}
        return data if isinstance(data, dict) else {"raw": data}
