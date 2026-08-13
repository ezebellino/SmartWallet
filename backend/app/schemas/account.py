from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.account import AccountType


class FinancialAccountBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    type: AccountType
    currency: str = Field(default="ARS", min_length=3, max_length=3)
    institution: str | None = Field(default=None, max_length=120)
    color: str = Field(default="#38bdf8", max_length=20)
    icon: str = Field(default="wallet", max_length=40)
    initial_balance: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class FinancialAccountCreate(FinancialAccountBase):
    pass


class FinancialAccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    type: AccountType | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    institution: str | None = Field(default=None, max_length=120)
    color: str | None = Field(default=None, max_length=20)
    icon: str | None = Field(default=None, max_length=40)
    initial_balance: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class FinancialAccountRead(FinancialAccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class AccountTransferBase(BaseModel):
    from_account_id: int
    to_account_id: int
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="ARS", min_length=3, max_length=3)
    description: str | None = Field(default=None, max_length=500)
    transfer_date: date

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()

    @model_validator(mode="after")
    def validate_distinct_accounts(self) -> "AccountTransferBase":
        if self.from_account_id == self.to_account_id:
            raise ValueError("Transfer accounts must be different")
        return self


class AccountTransferCreate(AccountTransferBase):
    pass


class AccountTransferUpdate(BaseModel):
    from_account_id: int | None = None
    to_account_id: int | None = None
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    description: str | None = Field(default=None, max_length=500)
    transfer_date: date | None = None

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else value


class AccountTransferRead(AccountTransferBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
