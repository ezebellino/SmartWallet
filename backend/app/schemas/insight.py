from decimal import Decimal

from pydantic import BaseModel


class SpendingInsight(BaseModel):
    type: str
    severity: str
    title: str
    description: str
    category_id: int | None = None
    category_name: str | None = None
    amount: Decimal | None = None
    percentage: float | None = None


class SpendingInsightsResponse(BaseModel):
    year: int
    month: int
    insights: list[SpendingInsight]

