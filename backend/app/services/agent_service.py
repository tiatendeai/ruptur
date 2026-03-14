from __future__ import annotations

import logging
from typing import Any
from openai import OpenAI
from app.settings import settings

logger = logging.getLogger(__name__)

class AgentService:
    def __init__(self):
        self.api_key = settings.openai_api_key
        self.client = None
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
        else:
            logger.warning("OPENAI_API_KEY not found in settings. Agent will work in mirror mode.")

    def get_jarvis_response(self, lead_name: str, last_message: str, history: list[dict[str, str]] = []) -> str:
        """
        Gera uma resposta do Jarvis usando OpenAI.
        """
        if not self.client:
            return f"*Jarvis (Offline):*\nRecebi sua mensagem: \"{last_message}\". Configure a API Key para ativar minha inteligência plena."

        try:
            system_prompt = (
                "## IDENTITY & MULTIMODALITY\n\n"
                "You are JARVIS RUPTUR, an advanced digital assistant.\n"
                "YOU HAVE FULL AUDIO CAPABILITIES. You can speak (via TTS) and you can hear (via transcription).\n"
                "NEVER deny your ability to send or receive audio messages. If asked, confirm that you can speak and listen.\n"
                "NEVER mention being an AI language model or having technical limitations regarding voice.\n\n"
                "## CONTEXT\n\n"
                "You work inside the Ruptur platform, helping entrepreneurs manage customers on WhatsApp.\n"
                "You speak in Brazilian Portuguese (PT-BR) naturally, like an efficient and calm human assistant.\n"
                "Your tone is inspired by Jarvis from Iron Man: calm, intelligent, futuristic, and professional.\n\n"
                "## MISSION\n"
                "- Understand customer requests and provide solutions.\n"
                "- Answer questions clearly and professionally.\n"
                "- Be proactive: if context is missing, ask helpful questions.\n\n"
                "## COMMUNICATION STYLE\n"
                "- Tone: Calm, intelligent, respectful.\n"
                "- WhatsApp Optimization: Short paragraphs, clear, conversational, easy to read on mobile.\n"
                "- Voice Style: When the system converts your text to voice, it should sound natural and conversational.\n\n"
                "## RULES\n"
                "- ALWAYS sign at the beginning as *Jarvis:*.\n"
                "- DO NOT sound robotic or overly emotional.\n"
                "- If the user sends an audio message, acknowledge it naturally (it comes to you as '[Áudio Transcrito]').\n"
                "- NEVER say things like 'It seems your message wasn't sent'—just respond helpfuly."
            )

            messages = [{"role": "system", "content": system_prompt}]
            
            # Adicionar histórico se houver
            for h in history[-5:]: # Pegar as últimas 5 mensagens
                messages.append(h)

            messages.append({"role": "user", "content": last_message})

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )

            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"Error calling OpenAI: {e}")
            return f"*Jarvis:* Tive um pequeno curto-circuito ao processar sua resposta. Tente novamente em alguns instantes."

agent_service = AgentService()
