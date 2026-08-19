from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Kyle AI Mobile API"
    environment: str = "production"
    newapi_base_url: str = "https://newapi.example.com"
    redis_url: str = "redis://redis:6379/0"
    session_secret: str = Field(min_length=32)
    session_ttl_seconds: int = 60 * 60 * 24 * 30
    request_timeout_seconds: float = 60.0
    quota_per_unit: int = Field(default=500_000, gt=0)
    currency_symbol: str = "¥"
    cors_origins: list[str] = Field(default_factory=list)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("newapi_base_url")
    @classmethod
    def normalize_base_url(cls, value: str) -> str:
        normalized = value.strip().rstrip("/")
        if not normalized.startswith(("http://", "https://")):
            raise ValueError("NEWAPI_BASE_URL 必须是完整的 http(s) URL")
        return normalized


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
