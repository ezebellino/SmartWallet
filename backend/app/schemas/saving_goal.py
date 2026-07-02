from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.saving_goal import SavingGoalStatus


class SavingGoalBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    target_amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    current_amount: Decimal = Field(default=Decimal("0"), ge=0, max_digits=12, decimal_places=2)
    target_date: date | None = None
    status: SavingGoalStatus = SavingGoalStatus.active


class SavingGoalCreate(SavingGoalBase):
    pass


class SavingGoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    target_amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    current_amount: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    target_date: date | None = None
    status: SavingGoalStatus | None = None


class SavingGoalContribution(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class SavingGoalRead(SavingGoalBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def progress_percentage(self) -> float:
        if self.target_amount <= 0:
            return 0.0
        progress = (self.current_amount / self.target_amount) * 100
        return float(min(progress, Decimal("100")))

    @computed_field
    @property
    def remaining_amount(self) -> Decimal:
        remaining = self.target_amount - self.current_amount
        return max(remaining, Decimal("0"))

