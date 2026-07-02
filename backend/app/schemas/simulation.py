from decimal import Decimal

from pydantic import BaseModel, Field


class CompoundInterestRequest(BaseModel):
    initial_amount: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    monthly_contribution: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    annual_interest_rate: Decimal = Field(ge=0, le=300)
    years: int = Field(ge=1, le=60)


class CompoundInterestPoint(BaseModel):
    month: int
    contributed_amount: Decimal
    interest_earned: Decimal
    balance: Decimal


class CompoundInterestResponse(BaseModel):
    final_balance: Decimal
    total_contributions: Decimal
    total_interest: Decimal
    points: list[CompoundInterestPoint]
