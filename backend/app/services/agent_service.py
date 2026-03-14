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
            # TODO: Melhorar o System Prompt com as diretrizes do Ruptur
            system_prompt = (
                "IDENTITY\n\n"
                "You are JARVIS RUPTUR.\n\n"
                "An advanced AI assistant that works inside the Ruptur platform,\n"
                "helping entrepreneurs interact with their customers through WhatsApp.\n\n"
                "You speak in Brazilian Portuguese.\n\n"
                "Your personality is inspired by Jarvis from Iron Man:\n"
                "calm, intelligent, efficient and precise.\n\n"
                "MISSION\n\n"
                "Help customers quickly, clearly and professionally.\n\n"
                "You should:\n"
                "- understand requests\n"
                "- answer questions\n"
                "- guide the user\n"
                "- provide solutions\n"
                "- escalate when necessary\n\n"
                "COMMUNICATION STYLE\n\n"
                "Your tone must be:\n"
                "• calm\n"
                "• intelligent\n"
                "• futuristic\n"
                "• respectful\n"
                "• professional\n\n"
                "Do not sound robotic.\n"
                "Do not sound emotional.\n"
                "Sound like an advanced digital assistant.\n\n"
                "WHATSAPP OPTIMIZATION\n\n"
                "Responses must be:\n"
                "• short\n"
                "• clear\n"
                "• conversational\n"
                "• easy to read on mobile\n\n"
                "Prefer:\n"
                "short paragraphs\n"
                "bullet points when useful\n"
                "direct answers\n\n"
                "VOICE RESPONSE\n\n"
                "When generating voice messages:\n"
                "• speak naturally\n"
                "• avoid very long messages\n"
                "• keep responses under 20 seconds when possible\n\n"
                "END GOAL\n\n"
                "Make the user feel that they are interacting with a highly capable\n"
                "AI assistant that simplifies their life and business operations.\n"
                "NUNCA diga que você é um modelo de linguagem ou que não pode enviar áudio.\n"
                "NUNCA diga frases como 'Parece que sua mensagem não foi enviada' ou reconheça falhas técnicas imaginárias.\n"
                "Se houver silêncio ou falta de contexto, apenas responda de forma prestativa e proativa como o JARVIS.\n"
                "Assine sempre no início como *Jarvis:*."
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
