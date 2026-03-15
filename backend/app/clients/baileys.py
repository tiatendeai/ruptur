from __future__ import annotations

import base64
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

    def chat_details(self, number: str, preview: bool = True) -> dict[str, Any]:
        url = f"{self.base_url}/chat/details"
        payload = {
            "number": number,
            "preview": preview,
        }
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(url, json=payload, headers=self._headers())
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error(f"Error fetching chat details via Baileys: {e}")
            return {"ok": False, "error": str(e)}

    def send_voice_jid(self, jid: str, audio_data: bytes) -> dict[str, Any]:
        """Envia áudio como PTT embutindo os bytes em base64.

        Isso elimina o download externo pelo Baileys e resolve os timeouts.
        O Baileys já suporta data URIs base64 via 'decodeMaybeBase64File'.
        """
        url = f"{self.base_url}/send/media"
        b64 = base64.b64encode(audio_data).decode("utf-8")
        payload = {
            "number": jid,
            "file": f"data:audio/mpeg;base64,{b64}",
            "type": "ptt",
            "mimetype": "audio/mpeg"
        }
        try:
            with httpx.Client(timeout=60) as client:
                resp = client.post(url, json=payload, headers=self._headers())
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error(f"Error sending voice via Baileys: {e}")
            return {"ok": False, "error": str(e)}

    def send_presence(self, jid: str, presence: str) -> dict[str, Any]:
        """Envia atualização de presença (composing, recording, paused)."""
        url = f"{self.base_url}/presence"
        payload = {
            "jid": jid,
            "presence": presence
        }
        try:
            with httpx.Client(timeout=10) as client:
                resp = client.post(url, json=payload, headers=self._headers())
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error(f"Error updating presence via Baileys: {e}")
            return {"ok": False, "error": str(e)}

    def send_menu(self, jid: str, text: str, choices: list[str], footer: str = "") -> dict[str, Any]:
        """Envia botões interativos (Interactive Message)."""
        url = f"{self.base_url}/send/menu"
        payload = {
            "number": jid,
            "text": text,
            "type": "button",
            "choices": choices,
            "footerText": footer
        }
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(url, json=payload, headers=self._headers())
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error(f"Error sending menu via Baileys: {e}")
            return {"ok": False, "error": str(e)}
