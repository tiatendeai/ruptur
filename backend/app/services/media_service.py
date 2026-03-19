from __future__ import annotations
import logging
import os
from typing import Optional
import httpx

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - ambiente sem SDK deve cair em modo degradado
    OpenAI = None  # type: ignore[assignment]

from app.settings import settings

logger = logging.getLogger(__name__)

class MediaService:
    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key and OpenAI is not None else None
        self.elevenlabs_api_key = settings.eleven_api_key

    def text_to_speech_openai(self, text: str, voice: str = "onyx") -> Optional[bytes]:
        """Gera áudio usando a API de TTS da OpenAI."""
        if not self.openai_client or not text:
            return None
        # Limite de segurança: 1000 caracteres para evitar áudios gigantescos
        clean_text = text[:1000]
        try:
            response = self.openai_client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=clean_text
            )
            return response.content
        except Exception as e:
            logger.error(f"Error in OpenAI TTS: {e}")
            return None

    def text_to_speech_elevenlabs(self, text: str, voice_id: Optional[str] = None) -> Optional[bytes]:
        """Gera áudio usando a API da ElevenLabs (Voz Jarvis personalizada)."""
        if not self.elevenlabs_api_key or not text:
            return None
        
        target_voice = voice_id or settings.eleven_voice_id
        # Limite de segurança: 1000 caracteres
        clean_text = text[:1000]
        
        try:
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{target_voice}"
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.elevenlabs_api_key
            }
            data = {
                "text": clean_text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.5
                }
            }
            response = httpx.post(url, json=data, headers=headers)
            if response.status_code == 200:
                return response.content
            else:
                logger.error(f"ElevenLabs error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error in ElevenLabs TTS: {e}")
            return None

media_service = MediaService()
