"""Application configuration."""

from pathlib import Path

from pydantic import BaseModel, Field

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ModuleNotFoundError:  # pragma: no cover - optional local dependency fallback
    BaseSettings = BaseModel

    def SettingsConfigDict(**_: object) -> dict[str, object]:
        return {}


class Settings(BaseSettings):
    app_name: str = "Multimedia Analyzer"
    api_prefix: str = "/api"
    database_url: str = Field(
        default="postgresql+psycopg2://postgres:postgres@db:5432/multimedia_analyzer"
    )
    redis_url: str = "redis://redis:6379/0"
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60
    auto_create_schema: bool = True
    upload_dir: str = "storage/uploads"
    max_upload_size_mb: int = 250
    default_alert_entities: str = "OpenAI,Microsoft,Google,Amazon"
    cors_allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    whisper_model_size: str = "tiny"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_language: str | None = None
    whisper_beam_size: int = 1
    whisper_cache_dir: str = "storage/whisper-cache"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def upload_path(self) -> Path:
        return Path(self.upload_dir)

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @property
    def whisper_cache_path(self) -> Path:
        return Path(self.whisper_cache_dir)


settings = Settings()
