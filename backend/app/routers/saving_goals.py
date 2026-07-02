from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.saving_goals import SavingGoalRepository
from app.schemas.saving_goal import (
    SavingGoalContribution,
    SavingGoalCreate,
    SavingGoalRead,
    SavingGoalUpdate,
)
from app.services.saving_goals import SavingGoalService

router = APIRouter(prefix="/goals", tags=["saving goals"])


def get_saving_goal_service(db: Session = Depends(get_db)) -> SavingGoalService:
    return SavingGoalService(SavingGoalRepository(db))


@router.get("", response_model=list[SavingGoalRead])
def list_goals(
    current_user: User = Depends(get_current_user),
    saving_goal_service: SavingGoalService = Depends(get_saving_goal_service),
) -> list[SavingGoalRead]:
    return saving_goal_service.list_goals(current_user.id)


@router.post("", response_model=SavingGoalRead, status_code=status.HTTP_201_CREATED)
def create_goal(
    data: SavingGoalCreate,
    current_user: User = Depends(get_current_user),
    saving_goal_service: SavingGoalService = Depends(get_saving_goal_service),
) -> SavingGoalRead:
    return saving_goal_service.create_goal(current_user.id, data)


@router.patch("/{goal_id}", response_model=SavingGoalRead)
def update_goal(
    goal_id: int,
    data: SavingGoalUpdate,
    current_user: User = Depends(get_current_user),
    saving_goal_service: SavingGoalService = Depends(get_saving_goal_service),
) -> SavingGoalRead:
    return saving_goal_service.update_goal(goal_id, current_user.id, data)


@router.post("/{goal_id}/contributions", response_model=SavingGoalRead)
def add_contribution(
    goal_id: int,
    data: SavingGoalContribution,
    current_user: User = Depends(get_current_user),
    saving_goal_service: SavingGoalService = Depends(get_saving_goal_service),
) -> SavingGoalRead:
    return saving_goal_service.add_contribution(goal_id, current_user.id, data.amount)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    saving_goal_service: SavingGoalService = Depends(get_saving_goal_service),
) -> None:
    saving_goal_service.delete_goal(goal_id, current_user.id)

