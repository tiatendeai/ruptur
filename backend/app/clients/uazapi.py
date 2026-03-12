from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


class UazapiNotConfiguredError(RuntimeError):
    pass


@dataclass(frozen=True)
class UazapiClient:
    base_url: str
    token: str

    def _headers(self) -> dict[str, str]:
        return {"token": self.token}

    def send_text(self, *, number: str, text: str) -> dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/send/text"
        payload = {"number": number, "text": text}
        with httpx.Client(timeout=30) as client:
            resp = client.post(url, json=payload, headers=self._headers())
            resp.raise_for_status()
            data = resp.json()
            if not isinstance(data, dict):
                return {"raw": data}
            return data

