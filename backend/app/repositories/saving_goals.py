from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.saving_goal import SavingGoal
from app.schemas.saving_goal import SavingGoalCreate, SavingGoalUpdate


class SavingGoalRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_user(self, user_id: int) -> list[SavingGoal]:
        statement = (
            select(SavingGoal)
            .where(SavingGoal.user_id == user_id)
            .order_by(SavingGoal.created_at.desc(), SavingGoal.id.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_id(self, goal_id: int, user_id: int) -> SavingGoal | None:
        statement = select(SavingGoal).where(
            SavingGoal.id == goal_id,
            SavingGoal.user_id == user_id,
        )
        return self.db.scalar(statement)

    def create(self, user_id: int, data: SavingGoalCreate) -> SavingGoal:
        goal = SavingGoal(user_id=user_id, **data.model_dump())
        self.db.add(goal)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def update(self, goal: SavingGoal, data: SavingGoalUpdate) -> SavingGoal:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(goal, field, value)
        self.db.commit()
        self.db.refresh(goal)
        return goal

    def delete(self, goal: SavingGoal) -> None:
        self.db.delete(goal)
        self.db.commit()

