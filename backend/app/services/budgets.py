import calendar
from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status

from app.models.budget import Budget
from app.models.category import CategoryType
from app.models.transaction import TransactionType
from app.repositories.budgets import BudgetRepository
from app.repositories.categories import CategoryRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetUsage


class BudgetService:
    def __init__(
        self,
        budgets: BudgetRepository,
        categories: CategoryRepository,
        transactions: TransactionRepository,
    ) -> None:
        self.budgets = budgets
        self.categories = categories
        self.transactions = transactions

    def list_budgets(self, *, user_id: int, year: int | None, month: int | None) -> list[Budget]:
        return self.budgets.list_by_user(user_id=user_id, year=year, month=month)

    def create_budget(self, user_id: int, data: BudgetCreate) -> Budget:
        self._validate_expense_category(user_id, data.category_id)
        existing_budget = self.budgets.get_by_category_period(
            user_id=user_id,
            category_id=data.category_id,
            year=data.year,
            month=data.month,
        )
        if existing_budget:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Budget already exists for this category and period",
            )
        return self.budgets.create(user_id, data)

    def update_budget(self, budget_id: int, user_id: int, data: BudgetUpdate) -> Budget:
        budget = self._get_owned_budget(budget_id, user_id)
        return self.budgets.update(budget, data)

    def delete_budget(self, budget_id: int, user_id: int) -> None:
        budget = self._get_owned_budget(budget_id, user_id)
        self.budgets.delete(budget)

    def get_budget_usage(self, *, user_id: int, year: int, month: int) -> list[BudgetUsage]:
        budgets = self.budgets.list_by_user(user_id=user_id, year=year, month=month)
        start_date = date(year, month, 1)
        end_date = date(year, month, calendar.monthrange(year, month)[1])
        expenses = self.transactions.list_by_user(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            transaction_type=TransactionType.expense,
        )
        spent_by_category: dict[int, Decimal] = {}
        for expense in expenses:
            spent_by_category[expense.category_id] = (
                spent_by_category.get(expense.category_id, Decimal("0")) + expense.amount
            )

        return [self._build_usage(budget, spent_by_category.get(budget.category_id, Decimal("0"))) for budget in budgets]

    def _build_usage(self, budget: Budget, spent_amount: Decimal) -> BudgetUsage:
        remaining_amount = budget.limit_amount - spent_amount
        usage_percentage = float((spent_amount / budget.limit_amount) * 100)
        return BudgetUsage(
            budget_id=budget.id,
            category_id=budget.category_id,
            category_name=budget.category.name,
            year=budget.year,
            month=budget.month,
            limit_amount=budget.limit_amount,
            spent_amount=spent_amount,
            remaining_amount=max(remaining_amount, Decimal("0")),
            usage_percentage=usage_percentage,
            is_over_budget=spent_amount > budget.limit_amount,
            is_near_limit=usage_percentage >= budget.alert_threshold_percentage,
        )

    def _get_owned_budget(self, budget_id: int, user_id: int) -> Budget:
        budget = self.budgets.get_by_id(budget_id, user_id)
        if not budget:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
        return budget

    def _validate_expense_category(self, user_id: int, category_id: int) -> None:
        category = self.categories.get_by_id(category_id, user_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        if category.type != CategoryType.expense:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Budgets can only be assigned to expense categories",
            )

