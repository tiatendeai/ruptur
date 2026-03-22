from __future__ import annotations

import re
from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Configurações globais da aplicação Ruptur
# Este arquivo carrega variáveis de ambiente do .env e define os padrões do sistema.
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Ambiente (dev, prod) e nível de log
    env: str = Field(default="dev", alias="RUPTUR_ENV")
    log_level: str = Field(default="INFO", alias="RUPTUR_LOG_LEVEL")

    # Configurações de Rede
    host: str = Field(default="127.0.0.1", alias="RUPTUR_HOST")
    port: int = Field(default=8000, alias="RUPTUR_PORT")

    # URL de conexão direta com o banco PostgreSQL (utilizada pelo backend)
    database_url: str | None = Field(default=None, alias="RUPTUR_DATABASE_URL")

    # Configurações do Provedor Uazapi (Instâncias WhatsApp)
    uazapi_base_url: str | None = Field(default=None, alias="RUPTUR_UAZAPI_BASE_URL")
    uazapi_token: str | None = Field(default=None, alias="RUPTUR_UAZAPI_TOKEN")
    cors_origins: str | None = Field(
        default="*",
        alias="RUPTUR_CORS_ORIGINS",
        description="Lista separada por vírgula de origins permitidos (ou *).",
    )

    public_url: str = Field(default="http://localhost:8000", alias="RUPTUR_PUBLIC_URL")
    
    # Configurações ElevenLabs (Clonagem de Voz)
    eleven_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("RUPTUR_ELEVEN_API_KEY", "ELEVENLABS_API_KEY"),
    )
    eleven_voice_id: str = Field(
        default="aU2vcrnwi348Gnc2Y1si",
        validation_alias=AliasChoices("RUPTUR_ELEVEN_VOICE_ID", "ELEVENLABS_VOICE_ID"),
    )
    
    # Configurações OpenAI (Processamento de IA e Transcrições)
    openai_prompt_id: str | None = Field(default=None, alias="RUPTUR_OPENAI_PROMPT_ID")
    openai_prompt_version: str = Field(default="1", alias="RUPTUR_OPENAI_PROMPT_VERSION")

    # Tokens de administração e endpoints de WhatsApp (Baileys)
    uazapi_admin_token: str | None = Field(default=None, alias="RUPTUR_UAZAPI_ADMIN_TOKEN")
    openai_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("RUPTUR_OPENAI_API_KEY", "OPENAI_API_KEY"),
    )

    baileys_base_url: str = Field(
        default="https://baileys.ruptur.cloud",
        validation_alias=AliasChoices("RUPTUR_BAILEYS_BASE_URL", "RUPTUR_BAILEYS_ENDPOINT"),
    )
    baileys_instance_id: str | None = Field(default=None, alias="RUPTUR_BAILEYS_INSTANCE_ID")

    # Configurações de Pagamento (Asaas) e Integrações (Jarvis)
    asaas_base_url: str = Field(default="https://api.asaas.com", alias="RUPTUR_ASAAS_BASE_URL")
    asaas_token: str | None = Field(default=None, alias="RUPTUR_ASAAS_TOKEN")
    jarvis_admin_token: str | None = Field(default=None, alias="RUPTUR_JARVIS_ADMIN_TOKEN")

    # INFRAESTRUTURA SUPABASE (KVM2 - Nova Base)
    # Estas chaves agora apontam por padrão para o novo ambiente axrwlboyowoskdxeogba
    supabase_url: str | None = Field(default=None, alias="RUPTUR_SUPABASE_URL")
    supabase_publishable_key: str | None = Field(default=None, alias="RUPTUR_SUPABASE_PUBLISHABLE_KEY")

    telegram_bot_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("RUPTUR_TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_TOKEN"),
    )
    telegram_allowed_user_ids: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "RUPTUR_TELEGRAM_ALLOWED_USER_IDS",
            "TELEGRAM_ALLOWED_USER_IDS",
        ),
    )

    github_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices("RUPTUR_GITHUB_TOKEN", "GITHUB_TOKEN"),
    )
    github_owner: str | None = Field(
        default=None,
        validation_alias=AliasChoices("RUPTUR_GITHUB_OWNER", "GITHUB_OWNER"),
    )
    github_repo: str | None = Field(
        default=None,
        validation_alias=AliasChoices("RUPTUR_GITHUB_REPO", "GITHUB_REPO"),
    )
    github_project_number: int | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "RUPTUR_GITHUB_PROJECT_NUMBER",
            "GITHUB_PROJECT_NUMBER",
        ),
    )

    cloudflare_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "RUPTUR_CLOUDFLARE_API_KEY",
            "CLOUDFLARE_API_KEY",
        ),
    )
    cloudflare_api_token: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "RUPTUR_CLOUDFLARE_API_TOKEN",
            "CLOUDFLARE_API_TOKEN",
        ),
    )
    cloudflare_origin_ca_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "RUPTUR_CLOUDFLARE_ORIGIN_CA_KEY",
            "CLOUDFLARE_ORIGIN_CA_KEY",
        ),
    )
    cloudflare_email: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "RUPTUR_CLOUDFLARE_EMAIL",
            "CLOUDFLARE_EMAIL",
        ),
    )
    cloudflare_zone_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "RUPTUR_CLOUDFLARE_ZONE_ID",
            "CLOUDFLARE_ZONE_ID",
        ),
    )
    cloudflare_account_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "RUPTUR_CLOUDFLARE_ACCOUNT_ID",
            "CLOUDFLARE_ACCOUNT_ID",
        ),
    )

    @field_validator("baileys_base_url", mode="before")
    @classmethod
    def normalize_baileys_base_url(cls, value: str | None) -> str | None:
        if not isinstance(value, str):
            return value
        normalized = value.strip().rstrip("/")
        if not normalized:
            return normalized
        normalized = re.sub(r"/send(?:/.*)?$", "", normalized, flags=re.IGNORECASE)
        return normalized.rstrip("/")


settings = Settings()
