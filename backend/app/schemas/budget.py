from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class BudgetBase(BaseModel):
    category_id: int
    year: int = Field(ge=2000, le=2100)
    month: int = Field(ge=1, le=12)
    limit_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    alert_threshold_percentage: int = Field(default=80, ge=1, le=100)


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    limit_amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    alert_threshold_percentage: int | None = Field(default=None, ge=1, le=100)


class BudgetRead(BudgetBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class BudgetUsage(BaseModel):
    budget_id: int
    category_id: int
    category_name: str
    year: int
    month: int
    limit_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    usage_percentage: float
    is_over_budget: bool
    is_near_limit: bool

