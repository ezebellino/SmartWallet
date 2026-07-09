from datetime import date
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


class CategoryExpenseChange(BaseModel):
    category_id: int
    category_name: str
    current_total: Decimal
    previous_total: Decimal
    delta: Decimal
    delta_percentage: float | None


class CategoryExpenseIncrease(BaseModel):
    year: int
    month: int
    previous_year: int
    previous_month: int
    category: CategoryExpenseChange | None


class MonthlyProjection(BaseModel):
    year: int
    month: int
    as_of_date: date
    elapsed_days: int
    days_in_month: int
    current_income: Decimal
    current_expense: Decimal
    current_net_balance: Decimal
    projected_income: Decimal
    projected_expense: Decimal
    projected_net_balance: Decimal
    daily_net_average: Decimal
    confidence: str
