from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.budgets import BudgetRepository
from app.repositories.categories import CategoryRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.budget import BudgetCreate, BudgetRead, BudgetUpdate, BudgetUsage
from app.services.budgets import BudgetService

router = APIRouter(prefix="/budgets", tags=["budgets"])


def get_budget_service(db: Session = Depends(get_db)) -> BudgetService:
    return BudgetService(
        BudgetRepository(db),
        CategoryRepository(db),
        TransactionRepository(db),
    )


@router.get("", response_model=list[BudgetRead])
def list_budgets(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    budget_service: BudgetService = Depends(get_budget_service),
) -> list[BudgetRead]:
    return budget_service.list_budgets(user_id=current_user.id, year=year, month=month)


@router.post("", response_model=BudgetRead, status_code=status.HTTP_201_CREATED)
def create_budget(
    data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    budget_service: BudgetService = Depends(get_budget_service),
) -> BudgetRead:
    return budget_service.create_budget(current_user.id, data)


@router.patch("/{budget_id}", response_model=BudgetRead)
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    budget_service: BudgetService = Depends(get_budget_service),
) -> BudgetRead:
    return budget_service.update_budget(budget_id, current_user.id, data)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    budget_service: BudgetService = Depends(get_budget_service),
) -> None:
    budget_service.delete_budget(budget_id, current_user.id)


@router.get("/usage", response_model=list[BudgetUsage])
def budget_usage(
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    current_user: User = Depends(get_current_user),
    budget_service: BudgetService = Depends(get_budget_service),
) -> list[BudgetUsage]:
    return budget_service.get_budget_usage(user_id=current_user.id, year=year, month=month)

