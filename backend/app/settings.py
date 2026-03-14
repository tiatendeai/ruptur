from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = Field(default="dev", alias="RUPTUR_ENV")
    log_level: str = Field(default="INFO", alias="RUPTUR_LOG_LEVEL")

    host: str = Field(default="127.0.0.1", alias="RUPTUR_HOST")
    port: int = Field(default=8000, alias="RUPTUR_PORT")

    database_url: str | None = Field(default=None, alias="RUPTUR_DATABASE_URL")

    cors_origins: str | None = Field(
        default="*",
        alias="RUPTUR_CORS_ORIGINS",
        description="Lista separada por vírgula de origins permitidos (ou *).",
    )

    public_url: str = Field(default="http://localhost:8000", alias="RUPTUR_PUBLIC_URL")
    
    # ElevenLabs Config
    eleven_api_key: str | None = Field(default=None, alias="RUPTUR_ELEVEN_API_KEY")
    eleven_voice_id: str = Field(default="aU2vcrnwi348Gnc2Y1si", alias="RUPTUR_ELEVEN_VOICE_ID")
    
    # OpenAI Prompt Config
    openai_prompt_id: str | None = Field(default=None, alias="RUPTUR_OPENAI_PROMPT_ID")
    openai_prompt_version: str = Field(default="1", alias="RUPTUR_OPENAI_PROMPT_VERSION")

    uazapi_base_url: str | None = Field(default=None, alias="RUPTUR_UAZAPI_BASE_URL")
    uazapi_token: str | None = Field(default=None, alias="RUPTUR_UAZAPI_TOKEN")
    uazapi_admin_token: str | None = Field(default=None, alias="RUPTUR_UAZAPI_ADMIN_TOKEN")
    
    openai_api_key: str | None = Field(default=None, alias="RUPTUR_OPENAI_API_KEY")

    baileys_base_url: str = Field(default="https://baileys.ruptur.cloud", alias="RUPTUR_BAILEYS_BASE_URL")
    baileys_instance_id: str = Field(default="default", alias="RUPTUR_BAILEYS_INSTANCE_ID")

    allowed_groups_jids: str = Field(default="", alias="RUPTUR_ALLOWED_GROUPS_JIDS")

    asaas_base_url: str = Field(default="https://api.asaas.com", alias="RUPTUR_ASAAS_BASE_URL")
    asaas_token: str | None = Field(default=None, alias="RUPTUR_ASAAS_TOKEN")


settings = Settings()
