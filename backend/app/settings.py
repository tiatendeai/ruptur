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

    uazapi_base_url: str | None = Field(default=None, alias="RUPTUR_UAZAPI_BASE_URL")
    uazapi_token: str | None = Field(default=None, alias="RUPTUR_UAZAPI_TOKEN")


settings = Settings()
