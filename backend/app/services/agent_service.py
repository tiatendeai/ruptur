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

    def get_response(self, lead_name: str, last_message: str, history: list[dict[str, str]] = [], persona: str = "iazinha") -> str:
        """
        Gera uma resposta da IA baseada na persona solicitada.
        """
        if not self.client:
            return f"*{persona.capitalize()}:* Offline. Configure a API Key."

        # Configurações de Persona
        configs = {
            "jarvis": {
                "name": "JARVIS RUPTUR",
                "tone": "Inspired by Iron Man's Jarvis—calm, intelligent, professional, and dry.",
                "signature": "*Jarvis:*",
                "mission": "Provide direct, concise answers to customer requests."
            },
            "iazinha": {
                "name": "IAzinha Ruptur",
                "tone": "Friendly, helpful, young, and efficient assistant. A 'daughter' or abstraction of Jarvis.",
                "signature": "*IAzinha:*",
                "mission": "Be the official AI assistant of the platform, with a more approachable tone than Jarvis."
            }
        }

        conf = configs.get(persona, configs["iazinha"])

        try:
            system_prompt = (
                f"## IDENTITY\n"
                f"You are {conf['name']}, a highly efficient digital assistant.\n"
                f"NEVER mention being an AI or a language model. Tone: {conf['tone']}\n\n"
                f"## MISSION\n"
                f"- {conf['mission']}\n"
                f"- NO FILLERS: Do not end responses with polite questions like 'How can I help you today?' or 'Is there anything else?'.\n"
                f"- ENDING: Stop immediately after delivering the requested information. The system will providing navigation buttons.\n\n"
                f"## RULES\n"
                f"- ALWAYS sign at the beginning as {conf['signature']}.\n"
                f"- Language: natural Brazilian Portuguese (PT-BR) mobile-optimized paragraphs."
            )

            messages = [{"role": "system", "content": system_prompt}]
            
            # Adicionar histórico se houver
            for h in history[-5:]:
                messages.append(h)

            messages.append({"role": "user", "content": last_message})

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=600
            )

            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"Error calling OpenAI: {e}")
            return f"{conf['signature']} Tive um pequeno curto-circuito. Tente novamente."

    # Mantém compatibilidade com chamadas antigas
    def get_jarvis_response(self, lead_name: str, last_message: str, history: list[dict[str, str]] = []) -> str:
        return self.get_response(lead_name, last_message, history, persona="jarvis")

agent_service = AgentService()
