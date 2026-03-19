from __future__ import annotations

<<<<<<< HEAD
=======
import base64
import logging
>>>>>>> work
from dataclasses import dataclass
from typing import Any

import httpx

<<<<<<< HEAD
=======
logger = logging.getLogger(__name__)

>>>>>>> work

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
<<<<<<< HEAD
=======
class UazapiAdminClient:
    base_url: str
    admin_token: str

    def _headers(self) -> dict[str, str]:
        return {"admintoken": self.admin_token}

    def list_instances(self) -> list[dict[str, Any]]:
        url = f"{self.base_url.rstrip('/')}/instance/all"
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
            raise UazapiError("uazapi_invalid_json", body=(resp.text or "")[:2000], url=str(resp.request.url))

        if isinstance(data, list):
            return [v for v in data if isinstance(v, dict)]
        raise UazapiError("uazapi_unexpected_response", body=str(data)[:2000], url=str(resp.request.url))

    def init_instance(
        self,
        *,
        name: str,
        system_name: str | None = None,
        admin_field01: str | None = None,
        admin_field02: str | None = None,
        fingerprint_profile: str | None = None,
        browser: str | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/instance/init"
        payload: dict[str, Any] = {"name": name}
        if system_name:
            payload["systemName"] = system_name
        if admin_field01 is not None:
            payload["adminField01"] = admin_field01
        if admin_field02 is not None:
            payload["adminField02"] = admin_field02
        if fingerprint_profile is not None:
            payload["fingerprintProfile"] = fingerprint_profile
        if browser is not None:
            payload["browser"] = browser
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
        return data if isinstance(data, dict) else {"raw": data}

    def raw_request(self, *, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any] | list[Any]:
        url = f"{self.base_url.rstrip('/')}{path}"
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.request(method.upper(), url, json=payload, headers=self._headers())
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

        if isinstance(data, (dict, list)):
            return data
        return {"raw": data}


@dataclass(frozen=True)
>>>>>>> work
class UazapiClient:
    base_url: str
    token: str

    def _headers(self) -> dict[str, str]:
        return {"token": self.token}

<<<<<<< HEAD
=======
    def chat_check(self, *, numbers: list[str]) -> list[dict[str, Any]]:
        url = f"{self.base_url.rstrip('/')}/chat/check"
        payload = {"numbers": numbers}
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
            raise UazapiError("uazapi_invalid_json", body=(resp.text or "")[:2000], url=str(resp.request.url))

        if isinstance(data, list):
            return [v for v in data if isinstance(v, dict)]
        raise UazapiError("uazapi_unexpected_response", body=str(data)[:2000], url=str(resp.request.url))

    def chat_details(self, *, number: str, preview: bool = True) -> dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/chat/details"
        payload = {"number": number, "preview": preview}
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
            raise UazapiError("uazapi_invalid_json", body=(resp.text or "")[:2000], url=str(resp.request.url))

        if isinstance(data, dict):
            return data
        raise UazapiError("uazapi_unexpected_response", body=str(data)[:2000], url=str(resp.request.url))

>>>>>>> work
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

<<<<<<< HEAD
=======
    def send_ptt(self, *, number: str, url: str) -> dict[str, Any]:
        endpoint = f"{self.base_url.rstrip('/')}/send/voice"
        payload = {"number": number, "url": url}
        try:
            with httpx.Client(timeout=60) as client:
                resp = client.post(endpoint, json=payload, headers=self._headers())
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error(f"Error sending PTT via UAZAPI: {e}")
            return {"ok": False, "error": str(e)}

    def send_ptt_base64(self, *, number: str, audio_data: bytes, mimetype: str = "audio/mpeg") -> dict[str, Any]:
        endpoint = f"{self.base_url.rstrip('/')}/send/media"
        payload = {
            "number": number,
            "type": "ptt",
            "file": base64.b64encode(audio_data).decode("utf-8"),
            "mimetype": mimetype,
        }
        try:
            with httpx.Client(timeout=60) as client:
                resp = client.post(endpoint, json=payload, headers=self._headers())
        except httpx.TimeoutException as exc:
            raise UazapiError("uazapi_timeout", url=endpoint) from exc
        except httpx.RequestError as exc:
            raise UazapiError("uazapi_request_error", url=endpoint) from exc

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

    def download_message(
        self,
        *,
        message_id: str,
        return_base64: bool = False,
        generate_mp3: bool = True,
        return_link: bool = False,
        transcribe: bool = False,
        openai_apikey: str | None = None,
        download_quoted: bool = False,
    ) -> dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}/message/download"
        payload: dict[str, Any] = {
            "id": message_id,
            "return_base64": return_base64,
            "generate_mp3": generate_mp3,
            "return_link": return_link,
            "transcribe": transcribe,
            "download_quoted": download_quoted,
        }
        if openai_apikey:
            payload["openai_apikey"] = openai_apikey

        try:
            with httpx.Client(timeout=60) as client:
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
        return data if isinstance(data, dict) else {"raw": data}

>>>>>>> work
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
<<<<<<< HEAD
=======

    def raw_request(self, *, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any] | list[Any]:
        url = f"{self.base_url.rstrip('/')}{path}"
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.request(method.upper(), url, json=payload, headers=self._headers())
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
        if isinstance(data, (dict, list)):
            return data
        return {"raw": data}
>>>>>>> work
