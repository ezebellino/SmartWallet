from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.dollar_saving import DollarSavingSource


class DollarSavingBase(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    source: DollarSavingSource = DollarSavingSource.manual
    notes: str | None = Field(default=None, max_length=500)
    saved_at: date | None = None

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        return normalized or None


class DollarSavingCreate(DollarSavingBase):
    pass


class DollarSavingUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    source: DollarSavingSource | None = None
    notes: str | None = Field(default=None, max_length=500)
    saved_at: date | None = None

    @field_validator("notes")
    @classmethod
    def normalize_notes(cls, value: str | None) -> str | None:
        if value is None:
            return value
        normalized = value.strip()
        return normalized or None


class DollarSavingRead(DollarSavingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
