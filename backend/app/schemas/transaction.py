from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.transaction import TransactionType


class TransactionBase(BaseModel):
    account_id: int | None = None
    category_id: int
    type: TransactionType
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="ARS", min_length=3, max_length=3)
    description: str | None = Field(default=None, max_length=500)
    transaction_date: date
    external_source: str | None = Field(default=None, max_length=40)
    external_id: str | None = Field(default=None, max_length=160)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    account_id: int | None = None
    category_id: int | None = None
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    description: str | None = Field(default=None, max_length=500)
    transaction_date: date | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
