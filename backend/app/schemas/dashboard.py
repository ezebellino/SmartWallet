from decimal import Decimal

from pydantic import BaseModel


class CategoryBreakdownItem(BaseModel):
    category_id: int
    category_name: str
    total: Decimal
    percentage: float


class MonthlySummary(BaseModel):
    year: int
    month: int
    total_income: Decimal
    total_expense: Decimal
    net_balance: Decimal
    savings_rate: float
    expense_by_category: list[CategoryBreakdownItem]


class MonthlyComparisonMetric(BaseModel):
    current: Decimal | float
    previous: Decimal | float
    delta: Decimal | float
    delta_percentage: float | None


class MonthlyComparison(BaseModel):
    year: int
    month: int
    previous_year: int
    previous_month: int
    total_income: MonthlyComparisonMetric
    total_expense: MonthlyComparisonMetric
    net_balance: MonthlyComparisonMetric
    savings_rate: MonthlyComparisonMetric
