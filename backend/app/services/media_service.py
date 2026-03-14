from __future__ import annotations
import logging
import os
import requests
from typing import Optional
from openai import OpenAI
from app.settings import settings

logger = logging.getLogger(__name__)

class MediaService:
    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
        self.elevenlabs_api_key = os.getenv("ELEVEN_API_KEY") or getattr(settings, "eleven_api_key", None)

    def text_to_speech_openai(self, text: str, voice: str = "onyx") -> Optional[bytes]:
        """Gera áudio usando a API de TTS da OpenAI."""
        if not self.openai_client:
            return None
        try:
            response = self.openai_client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text
            )
            return response.content
        except Exception as e:
            logger.error(f"Error in OpenAI TTS: {e}")
            return None

    def text_to_speech_elevenlabs(self, text: str, voice_id: str = "aU2vcrnwi348Gnc2Y1si") -> Optional[bytes]:
        """Gera áudio usando a API da ElevenLabs (Voz Jarvis personalizada)."""
        if not self.elevenlabs_api_key:
            return None
        try:
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.elevenlabs_api_key
            }
            data = {
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.5
                }
            }
            response = requests.post(url, json=data, headers=headers)
            if response.status_code == 200:
                return response.content
            else:
                logger.error(f"ElevenLabs error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error in ElevenLabs TTS: {e}")
            return None

media_service = MediaService()
