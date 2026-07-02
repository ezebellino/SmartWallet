import calendar
from datetime import date
from decimal import Decimal

from app.models.transaction import TransactionType
from app.repositories.budgets import BudgetRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.insight import SpendingInsight, SpendingInsightsResponse
from app.services.budgets import BudgetService


class InsightService:
    def __init__(
        self,
        budgets: BudgetRepository,
        budget_service: BudgetService,
        transactions: TransactionRepository,
    ) -> None:
        self.budgets = budgets
        self.budget_service = budget_service
        self.transactions = transactions

    def get_spending_insights(self, *, user_id: int, year: int, month: int) -> SpendingInsightsResponse:
        insights: list[SpendingInsight] = []
        budget_usage = self.budget_service.get_budget_usage(user_id=user_id, year=year, month=month)

        for usage in budget_usage:
            if usage.is_over_budget:
                insights.append(
                    SpendingInsight(
                        type="budget_exceeded",
                        severity="high",
                        title=f"{usage.category_name} exceeded its monthly budget",
                        description=(
                            f"You spent {usage.spent_amount} against a budget of "
                            f"{usage.limit_amount}."
                        ),
                        category_id=usage.category_id,
                        category_name=usage.category_name,
                        amount=usage.spent_amount - usage.limit_amount,
                        percentage=usage.usage_percentage,
                    )
                )
            elif usage.is_near_limit:
                insights.append(
                    SpendingInsight(
                        type="budget_near_limit",
                        severity="medium",
                        title=f"{usage.category_name} is near its monthly budget",
                        description=(
                            f"You already used {usage.usage_percentage:.1f}% of this category budget."
                        ),
                        category_id=usage.category_id,
                        category_name=usage.category_name,
                        amount=usage.remaining_amount,
                        percentage=usage.usage_percentage,
                    )
                )

        insights.extend(self._category_concentration_insights(user_id=user_id, year=year, month=month))

        return SpendingInsightsResponse(year=year, month=month, insights=insights)

    def _category_concentration_insights(
        self,
        *,
        user_id: int,
        year: int,
        month: int,
    ) -> list[SpendingInsight]:
        start_date = date(year, month, 1)
        end_date = date(year, month, calendar.monthrange(year, month)[1])
        expenses = self.transactions.list_by_user(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            transaction_type=TransactionType.expense,
        )
        total_expense = sum((expense.amount for expense in expenses), Decimal("0"))
        if total_expense <= 0:
            return []

        totals: dict[int, Decimal] = {}
        names: dict[int, str] = {}
        for expense in expenses:
            totals[expense.category_id] = totals.get(expense.category_id, Decimal("0")) + expense.amount
            names[expense.category_id] = expense.category.name

        insights: list[SpendingInsight] = []
        for category_id, amount in totals.items():
            percentage = float((amount / total_expense) * 100)
            if percentage >= 50:
                insights.append(
                    SpendingInsight(
                        type="category_concentration",
                        severity="medium",
                        title=f"{names[category_id]} concentrates most of your spending",
                        description=(
                            f"This category represents {percentage:.1f}% of your monthly expenses."
                        ),
                        category_id=category_id,
                        category_name=names[category_id],
                        amount=amount,
                        percentage=percentage,
                    )
                )
        return insights

