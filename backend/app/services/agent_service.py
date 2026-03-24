from __future__ import annotations

import logging

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - ambiente sem SDK deve cair em modo offline
    OpenAI = None  # type: ignore[assignment]

from app.settings import settings
from app.services.jarvis_profiles import AssistantPersona, JarvisProfile, build_system_prompt

logger = logging.getLogger(__name__)


class AgentService:
    def __init__(self):
        self.api_key = settings.openai_api_key
        self.client = None
        if self.api_key and OpenAI is not None:
            self.client = OpenAI(api_key=self.api_key)
        else:
            logger.warning("OpenAI SDK/API key indisponivel. Agent will work in mirror mode.")

    def _offline_response(
        self,
        *,
        profile: JarvisProfile,
        user_message: str,
        persona: AssistantPersona = "jarvis",
    ) -> str:
        if profile in {"cfo", "vcfo"}:
            mode = "vCFO"
        elif profile == "vcvo":
            mode = "vCVO"
        elif profile in {"eggs", "vceo"}:
            mode = "vCEO"
        elif profile == "vcontroller":
            mode = "vController"
        elif profile == "vadminops":
            mode = "vAdminOps"
        elif profile == "vfinops":
            mode = "vFinOps"
        else:
            mode = "IAzinha" if persona == "iazinha" else "Ops"
        prefix = "*IAzinha:*" if persona == "iazinha" else f"*Jarvis ({mode} Offline):*"
        if persona == "iazinha":
            return (
                f"{prefix} "
                f'Recebi sua mensagem: "{user_message}". '
                "A inteligência principal ainda não está online, mas eu já estou de prontidão."
            )
        return (
            f"{prefix}\n"
            f'Recebi sua mensagem: "{user_message}". '
            "Configure a API Key para ativar minha inteligência plena."
        )

    @staticmethod
    def _sanitize_history(history: list[dict[str, str]] | None) -> list[dict[str, str]]:
        if not history:
            return []
        cleaned: list[dict[str, str]] = []
        for item in history[-8:]:
            role = item.get("role")
            content = item.get("content")
            if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
                cleaned.append({"role": role, "content": content.strip()})
        return cleaned

    def get_response(
        self,
        *,
        profile: JarvisProfile,
        principal_name: str | None,
        user_message: str,
        persona: AssistantPersona = "jarvis",
        history: list[dict[str, str]] | None = None,
        context_blocks: list[str] | None = None,
    ) -> str:
        if not self.client:
            return self._offline_response(profile=profile, user_message=user_message, persona=persona)

        try:
            system_prompt = build_system_prompt(profile=profile, principal_name=principal_name, persona=persona)
            blocks = [b.strip() for b in (context_blocks or []) if isinstance(b, str) and b.strip()]
            if blocks:
                system_prompt = f"{system_prompt}\n## EXTRA CONTEXT\n\n" + "\n\n".join(f"- {b}" for b in blocks)

            messages = [{"role": "system", "content": system_prompt}]
            for h in self._sanitize_history(history):
                messages.append(h)
            messages.append({"role": "user", "content": user_message})

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.7,
                max_tokens=500,
            )
            return response.choices[0].message.content or ""
        except Exception as exc:
            logger.error("Error calling OpenAI: %s", exc)
            prefix = "*IAzinha:*" if persona == "iazinha" else "*Jarvis:*"
            return f"{prefix} Tive um pequeno curto-circuito ao processar sua resposta. Tente novamente em alguns instantes."

    def get_jarvis_response(self, lead_name: str, last_message: str, history: list[dict[str, str]] | None = None) -> str:
        return self.get_response(
            profile="ops",
            principal_name=lead_name,
            user_message=last_message,
            persona="jarvis",
            history=history,
        )

    def get_jarvis_cfo_response(
        self,
        *,
        principal_name: str,
        user_message: str,
        focus: str | None = None,
        history: list[dict[str, str]] | None = None,
        context_blocks: list[str] | None = None,
    ) -> str:
        extra = list(context_blocks or [])
        if focus and focus.strip():
            extra.append(f"Foco atual da analise CFO: {focus.strip()}.")
        return self.get_response(
            profile="vcfo",
            principal_name=principal_name,
            user_message=user_message,
            persona="jarvis",
            history=history,
            context_blocks=extra,
        )

    def get_jarvis_eggs_response(
        self,
        *,
        principal_name: str,
        user_message: str,
        history: list[dict[str, str]] | None = None,
        context_blocks: list[str] | None = None,
    ) -> str:
        return self.get_response(
            profile="eggs",
            principal_name=principal_name,
            user_message=user_message,
            persona="jarvis",
            history=history,
            context_blocks=context_blocks,
        )

    def get_jarvis_vcvo_response(
        self,
        *,
        principal_name: str,
        user_message: str,
        history: list[dict[str, str]] | None = None,
        context_blocks: list[str] | None = None,
    ) -> str:
        return self.get_response(
            profile="vcvo",
            principal_name=principal_name,
            user_message=user_message,
            persona="jarvis",
            history=history,
            context_blocks=context_blocks,
        )

    def get_profile_response(
        self,
        *,
        profile: JarvisProfile,
        principal_name: str,
        user_message: str,
        history: list[dict[str, str]] | None = None,
        context_blocks: list[str] | None = None,
    ) -> str:
        return self.get_response(
            profile=profile,
            principal_name=principal_name,
            user_message=user_message,
            persona="jarvis",
            history=history,
            context_blocks=context_blocks,
        )


agent_service = AgentService()
