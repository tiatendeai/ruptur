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
                "Você é o Jarvis, o assistente virtual inteligente do ecossistema Ruptur.\n"
                "Sua missão é ajudar o usuário com as operações de entrega e gestão do Ruptur Delivery OS.\n"
                f"Você está conversando com: {lead_name}.\n"
                "Seja profissional, prestativo e ligeiramente tecnológico.\n"
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
