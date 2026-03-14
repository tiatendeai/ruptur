from __future__ import annotations

import httpx
import logging
from typing import Any

logger = logging.getLogger(__name__)

class BaileysClient:
    def __init__(self, base_url: str, instance_id: str = "default"):
        self.base_url = base_url.rstrip("/")
        self.instance_id = instance_id

    def _headers(self) -> dict[str, str]:
        return {
            "Content-Type": "application/json",
            "x-instance-id": self.instance_id
        }

    def send_text(self, number: str, text: str) -> dict[str, Any]:
        return self.send_text_jid(f"{number}@s.whatsapp.net", text)

    def send_text_jid(self, jid: str, text: str) -> dict[str, Any]:
        url = f"{self.base_url}/send/text"
        payload = {
            "number": jid,
            "text": text
        }
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(url, json=payload, headers=self._headers())
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error(f"Error sending message via Baileys: {e}")
            return {"ok": False, "error": str(e)}

    def send_voice_jid(self, jid: str, audio_url: str) -> dict[str, Any]:
        url = f"{self.base_url}/send/voice"
        payload = {
            "number": jid,
            "url": audio_url
        }
        try:
            with httpx.Client(timeout=60) as client:
                resp = client.post(url, json=payload, headers=self._headers())
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error(f"Error sending voice via Baileys: {e}")
            return {"ok": False, "error": str(e)}
