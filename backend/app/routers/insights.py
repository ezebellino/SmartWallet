from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.budgets import BudgetRepository
from app.repositories.categories import CategoryRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.insight import SpendingInsightsResponse
from app.services.budgets import BudgetService
from app.services.insights import InsightService

router = APIRouter(prefix="/insights", tags=["insights"])


def get_insight_service(db: Session = Depends(get_db)) -> InsightService:
    budget_repository = BudgetRepository(db)
    transaction_repository = TransactionRepository(db)
    budget_service = BudgetService(
        budget_repository,
        CategoryRepository(db),
        transaction_repository,
    )
    return InsightService(budget_repository, budget_service, transaction_repository)


@router.get("/spending", response_model=SpendingInsightsResponse)
def spending_insights(
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    current_user: User = Depends(get_current_user),
    insight_service: InsightService = Depends(get_insight_service),
) -> SpendingInsightsResponse:
    return insight_service.get_spending_insights(user_id=current_user.id, year=year, month=month)

