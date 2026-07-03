from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class MarketQuoteResult(BaseModel):
    asset_id: int
    symbol: str
    provider: str | None
    price: Decimal | None
    currency: str
    fetched_at: datetime | None
    status: str
    message: str


class MarketDataRefreshResponse(BaseModel):
    updated_count: int
    skipped_count: int
    failed_count: int
    quotes: list[MarketQuoteResult]


class MarketDataIntegration(BaseModel):
    key: str
    name: str
    status: str
    enabled: bool
    auth_required: bool
    has_api_key: bool
    api_key_last4: str | None
    coverage: str
    supported_asset_types: list[str]
    supported_symbols: list[str]
    configured_assets_count: int
    last_refresh_at: datetime | None


class MarketDataIntegrationsResponse(BaseModel):
    integrations: list[MarketDataIntegration]


class MarketDataIntegrationUpdate(BaseModel):
    enabled: bool | None = None
    api_key: str | None = None
    clear_api_key: bool = False
