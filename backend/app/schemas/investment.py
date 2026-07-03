from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.investment import (
    InvestmentAssetType,
    InvestmentOperationType,
    InvestmentRiskLevel,
)


class InvestmentAssetBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    symbol: str = Field(min_length=1, max_length=30)
    asset_type: InvestmentAssetType
    currency: str = Field(default="USD", min_length=3, max_length=3)
    risk_level: InvestmentRiskLevel = InvestmentRiskLevel.medium
    current_price: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=4)

    @field_validator("symbol", "currency")
    @classmethod
    def uppercase_code(cls, value: str) -> str:
        return value.upper().strip()


class InvestmentAssetCreate(InvestmentAssetBase):
    pass


class InvestmentAssetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    symbol: str | None = Field(default=None, min_length=1, max_length=30)
    asset_type: InvestmentAssetType | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    risk_level: InvestmentRiskLevel | None = None
    current_price: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=4)

    @field_validator("symbol", "currency")
    @classmethod
    def uppercase_code(cls, value: str | None) -> str | None:
        return value.upper().strip() if value else value


class InvestmentAssetRead(InvestmentAssetBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    price_source: str | None
    price_updated_at: datetime | None
    created_at: datetime
    updated_at: datetime


class InvestmentOperationBase(BaseModel):
    asset_id: int
    operation_type: InvestmentOperationType
    quantity: Decimal = Field(gt=0, max_digits=18, decimal_places=8)
    unit_price: Decimal = Field(gt=0, max_digits=14, decimal_places=4)
    fees: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    operation_date: date


class InvestmentOperationCreate(InvestmentOperationBase):
    pass


class InvestmentOperationRead(InvestmentOperationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class InvestmentPriceSnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_id: int
    provider: str
    price: Decimal
    currency: str
    fetched_at: datetime
    created_at: datetime


class PortfolioPosition(BaseModel):
    asset_id: int
    name: str
    symbol: str
    asset_type: InvestmentAssetType
    risk_level: InvestmentRiskLevel
    currency: str
    quantity: Decimal
    average_cost: Decimal
    invested_amount: Decimal
    estimated_value: Decimal | None
    unrealized_gain_loss: Decimal | None


class PortfolioSummary(BaseModel):
    total_invested: Decimal
    total_estimated_value: Decimal
    total_unrealized_gain_loss: Decimal
    positions: list[PortfolioPosition]
    risk_warning: str
