import calendar
from datetime import date
from decimal import Decimal

from app.models.transaction import TransactionType
from app.repositories.transactions import TransactionRepository
from app.schemas.dashboard import CategoryBreakdownItem, MonthlySummary


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

