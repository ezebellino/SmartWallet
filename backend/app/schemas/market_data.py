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

