from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.budget import Budget
from app.schemas.budget import BudgetCreate, BudgetUpdate


class BudgetRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_user(
        self,
        *,
        user_id: int,
        year: int | None = None,
        month: int | None = None,
    ) -> list[Budget]:
        statement = (
            select(Budget)
            .options(joinedload(Budget.category))
            .where(Budget.user_id == user_id)
            .order_by(Budget.year.desc(), Budget.month.desc(), Budget.id.desc())
        )
        if year is not None:
            statement = statement.where(Budget.year == year)
        if month is not None:
            statement = statement.where(Budget.month == month)
        return list(self.db.scalars(statement).all())

    def get_by_id(self, budget_id: int, user_id: int) -> Budget | None:
        statement = select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
        return self.db.scalar(statement)

    def get_by_category_period(
        self,
        *,
        user_id: int,
        category_id: int,
        year: int,
        month: int,
    ) -> Budget | None:
        statement = select(Budget).where(
            Budget.user_id == user_id,
            Budget.category_id == category_id,
            Budget.year == year,
            Budget.month == month,
        )
        return self.db.scalar(statement)

    def create(self, user_id: int, data: BudgetCreate) -> Budget:
        budget = Budget(user_id=user_id, **data.model_dump())
        self.db.add(budget)
        self.db.commit()
        self.db.refresh(budget)
        return budget

    def update(self, budget: Budget, data: BudgetUpdate) -> Budget:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(budget, field, value)
        self.db.commit()
        self.db.refresh(budget)
        return budget

    def delete(self, budget: Budget) -> None:
        self.db.delete(budget)
        self.db.commit()

