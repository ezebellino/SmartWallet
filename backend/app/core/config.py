from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Smart Wallet AI API"
    app_version: str = "0.1.0"
    environment: str = "local"
    debug: bool = True

    database_url: str = Field(
        default="postgresql+psycopg://smart_wallet:smart_wallet@localhost:5432/smart_wallet"
    )

    jwt_secret_key: str = Field(default="change-me-in-production")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
    )
    ai_provider: str = "stub"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    openai_timeout_seconds: float = 20.0
    market_data_auto_refresh_enabled: bool = False
    market_data_refresh_interval_minutes: int = 90
    market_data_refresh_startup_delay_seconds: float = 5.0
    worker_interval_minutes: int = 90
    worker_startup_delay_seconds: float = 5.0
    mercado_pago_sync_lookback_days: int = 35

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
