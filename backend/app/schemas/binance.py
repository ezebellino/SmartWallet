from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BinanceIntegrationRead(BaseModel):
    enabled: bool
    status: str
    has_api_key: bool
    api_key_last4: str | None
    last_sync_at: datetime | None


class BinanceIntegrationUpdate(BaseModel):
    enabled: bool | None = None
    api_key: str | None = Field(default=None, min_length=8, max_length=256)
    api_secret: str | None = Field(default=None, min_length=8, max_length=256)
    clear_credentials: bool = False


class BinanceBalance(BaseModel):
    asset: str
    free: Decimal
    locked: Decimal
    total: Decimal


class BinanceAccountRead(BaseModel):
    account_type: str | None
    can_trade: bool | None
    can_deposit: bool | None
    can_withdraw: bool | None
    permissions: list[str]
    balances: list[BinanceBalance]
    fetched_at: datetime


class BinanceBalanceSnapshotRead(BinanceBalance):
    id: int
    fetched_at: datetime
    created_at: datetime


class BinanceSyncResponse(BaseModel):
    synced_count: int
    balances: list[BinanceBalanceSnapshotRead]
    notifications_generated_count: int = 0


class BinancePortfolioHolding(BaseModel):
    asset: str
    free: Decimal
    locked: Decimal
    total: Decimal
    price_usd: Decimal | None
    estimated_value_usd: Decimal | None
    allocation_percentage: float | None
    price_source: str | None


class BinancePortfolioAlert(BaseModel):
    type: str
    severity: str
    title: str
    message: str
    asset: str | None = None
    value: Decimal | None = None
    percentage: float | None = None


class BinancePortfolioSummary(BaseModel):
    total_estimated_value_usd: Decimal
    asset_count: int
    priced_asset_count: int
    unpriced_asset_count: int
    latest_sync_at: datetime | None
    holdings: list[BinancePortfolioHolding]
    alerts: list[BinancePortfolioAlert]
