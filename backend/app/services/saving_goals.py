from decimal import Decimal

from fastapi import HTTPException, status

from app.models.saving_goal import SavingGoal, SavingGoalStatus
from app.repositories.saving_goals import SavingGoalRepository
from app.schemas.saving_goal import SavingGoalCreate, SavingGoalUpdate


class SavingGoalService:
    def __init__(self, saving_goals: SavingGoalRepository) -> None:
        self.saving_goals = saving_goals

    def list_goals(self, user_id: int) -> list[SavingGoal]:
        return self.saving_goals.list_by_user(user_id)

    def create_goal(self, user_id: int, data: SavingGoalCreate) -> SavingGoal:
        self._validate_goal_amounts(data.current_amount, data.target_amount)
        normalized_data = data.model_copy(update={"name": data.name.strip()})
        return self.saving_goals.create(user_id, normalized_data)

    def update_goal(self, goal_id: int, user_id: int, data: SavingGoalUpdate) -> SavingGoal:
        goal = self._get_owned_goal(goal_id, user_id)
        target_amount = data.target_amount if data.target_amount is not None else goal.target_amount
        current_amount = data.current_amount if data.current_amount is not None else goal.current_amount
        self._validate_goal_amounts(current_amount, target_amount)
        return self.saving_goals.update(goal, data)

    def add_contribution(self, goal_id: int, user_id: int, amount: Decimal) -> SavingGoal:
        goal = self._get_owned_goal(goal_id, user_id)
        if goal.status not in {SavingGoalStatus.active, SavingGoalStatus.completed}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only active or completed goals can receive contributions",
            )

        new_amount = goal.current_amount + amount
        next_status = SavingGoalStatus.completed if new_amount >= goal.target_amount else SavingGoalStatus.active
        data = SavingGoalUpdate(current_amount=new_amount, status=next_status)
        return self.saving_goals.update(goal, data)

    def delete_goal(self, goal_id: int, user_id: int) -> None:
        goal = self._get_owned_goal(goal_id, user_id)
        self.saving_goals.delete(goal)

    def _get_owned_goal(self, goal_id: int, user_id: int) -> SavingGoal:
        goal = self.saving_goals.get_by_id(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saving goal not found")
        return goal

    def _validate_goal_amounts(self, current_amount: Decimal, target_amount: Decimal) -> None:
        if current_amount > target_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current amount cannot be greater than target amount",
            )

