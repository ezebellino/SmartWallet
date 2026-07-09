import calendar
from datetime import date
from decimal import Decimal

from app.models.transaction import TransactionType
from app.repositories.transactions import TransactionRepository
from app.schemas.dashboard import (
    CategoryBreakdownItem,
    CategoryExpenseChange,
    CategoryExpenseIncrease,
    MonthlyComparison,
    MonthlyComparisonMetric,
    MonthlySummary,
)


class DashboardService:
    def __init__(self, transactions: TransactionRepository) -> None:
        self.transactions = transactions

    def get_monthly_summary(self, *, user_id: int, year: int, month: int) -> MonthlySummary:
        last_day = calendar.monthrange(year, month)[1]
        movements = self.transactions.list_by_user(
            user_id=user_id,
            start_date=date(year, month, 1),
            end_date=date(year, month, last_day),
        )

        total_income = sum(
            (movement.amount for movement in movements if movement.type == TransactionType.income),
            Decimal("0"),
        )
        total_expense = sum(
            (movement.amount for movement in movements if movement.type == TransactionType.expense),
            Decimal("0"),
        )
        net_balance = total_income - total_expense
        savings_rate = float((net_balance / total_income) * 100) if total_income > 0 else 0.0

        category_totals: dict[int, Decimal] = {}
        category_names: dict[int, str] = {}
        for movement in movements:
            if movement.type != TransactionType.expense:
                continue
            category_totals[movement.category_id] = (
                category_totals.get(movement.category_id, Decimal("0")) + movement.amount
            )
            category_names[movement.category_id] = movement.category.name

        expense_by_category = [
            CategoryBreakdownItem(
                category_id=category_id,
                category_name=category_names[category_id],
                total=total,
                percentage=float((total / total_expense) * 100) if total_expense > 0 else 0.0,
            )
            for category_id, total in sorted(
                category_totals.items(),
                key=lambda item: item[1],
                reverse=True,
            )
        ]

        return MonthlySummary(
            year=year,
            month=month,
            total_income=total_income,
            total_expense=total_expense,
            net_balance=net_balance,
            savings_rate=savings_rate,
            expense_by_category=expense_by_category,
        )

    def get_monthly_comparison(self, *, user_id: int, year: int, month: int) -> MonthlyComparison:
        previous_year, previous_month = self._previous_month(year=year, month=month)
        current = self.get_monthly_summary(user_id=user_id, year=year, month=month)
        previous = self.get_monthly_summary(user_id=user_id, year=previous_year, month=previous_month)

        return MonthlyComparison(
            year=year,
            month=month,
            previous_year=previous_year,
            previous_month=previous_month,
            total_income=self._build_metric(current.total_income, previous.total_income),
            total_expense=self._build_metric(current.total_expense, previous.total_expense),
            net_balance=self._build_metric(current.net_balance, previous.net_balance),
            savings_rate=self._build_metric(current.savings_rate, previous.savings_rate),
        )

    def get_biggest_category_increase(self, *, user_id: int, year: int, month: int) -> CategoryExpenseIncrease:
        previous_year, previous_month = self._previous_month(year=year, month=month)
        current = self.get_monthly_summary(user_id=user_id, year=year, month=month)
        previous = self.get_monthly_summary(user_id=user_id, year=previous_year, month=previous_month)

        previous_by_category = {item.category_id: item for item in previous.expense_by_category}
        changes = []
        for current_item in current.expense_by_category:
            previous_item = previous_by_category.get(current_item.category_id)
            previous_total = previous_item.total if previous_item else Decimal("0")
            delta = current_item.total - previous_total
            if delta <= 0:
                continue
            changes.append(
                CategoryExpenseChange(
                    category_id=current_item.category_id,
                    category_name=current_item.category_name,
                    current_total=current_item.total,
                    previous_total=previous_total,
                    delta=delta,
                    delta_percentage=float((delta / previous_total) * 100) if previous_total else None,
                )
            )

        biggest_change = max(changes, key=lambda item: item.delta, default=None)
        return CategoryExpenseIncrease(
            year=year,
            month=month,
            previous_year=previous_year,
            previous_month=previous_month,
            category=biggest_change,
        )

    @staticmethod
    def _previous_month(*, year: int, month: int) -> tuple[int, int]:
        if month == 1:
            return year - 1, 12
        return year, month - 1

    @staticmethod
    def _build_metric(current: Decimal | float, previous: Decimal | float) -> MonthlyComparisonMetric:
        delta = current - previous
        delta_percentage = float((delta / previous) * 100) if previous else None
        return MonthlyComparisonMetric(
            current=current,
            previous=previous,
            delta=delta,
            delta_percentage=delta_percentage,
        )
