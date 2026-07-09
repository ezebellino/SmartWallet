from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.transactions import TransactionRepository
from app.schemas.dashboard import CategoryExpenseIncrease, MonthlyComparison, MonthlySummary
from app.services.dashboard import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_dashboard_service(db: Session = Depends(get_db)) -> DashboardService:
    return DashboardService(TransactionRepository(db))


@router.get("/monthly-summary", response_model=MonthlySummary)
def monthly_summary(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
) -> MonthlySummary:
    today = date.today()
    return dashboard_service.get_monthly_summary(
        user_id=current_user.id,
        year=year or today.year,
        month=month or today.month,
    )


@router.get("/monthly-comparison", response_model=MonthlyComparison)
def monthly_comparison(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
) -> MonthlyComparison:
    today = date.today()
    return dashboard_service.get_monthly_comparison(
        user_id=current_user.id,
        year=year or today.year,
        month=month or today.month,
    )


@router.get("/category-expense-increase", response_model=CategoryExpenseIncrease)
def category_expense_increase(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
) -> CategoryExpenseIncrease:
    today = date.today()
    return dashboard_service.get_biggest_category_increase(
        user_id=current_user.id,
        year=year or today.year,
        month=month or today.month,
    )
