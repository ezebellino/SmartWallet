from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.ai_reports import AiReportRepository
from app.repositories.budgets import BudgetRepository
from app.repositories.categories import CategoryRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.ai_report import AiReportGenerateRequest, AiReportRead
from app.services.ai_reports import AiReportService
from app.services.budgets import BudgetService
from app.services.dashboard import DashboardService
from app.services.insights import InsightService

router = APIRouter(prefix="/ai", tags=["ai"])


def get_ai_report_service(db: Session = Depends(get_db)) -> AiReportService:
    transaction_repository = TransactionRepository(db)
    budget_repository = BudgetRepository(db)
    budget_service = BudgetService(
        budget_repository,
        CategoryRepository(db),
        transaction_repository,
    )
    insight_service = InsightService(
        budget_repository,
        budget_service,
        transaction_repository,
    )
    return AiReportService(
        AiReportRepository(db),
        DashboardService(transaction_repository),
        insight_service,
    )


@router.get("/reports", response_model=list[AiReportRead])
def list_reports(
    current_user: User = Depends(get_current_user),
    ai_report_service: AiReportService = Depends(get_ai_report_service),
) -> list[AiReportRead]:
    return ai_report_service.list_reports(current_user.id)


@router.post("/monthly-report", response_model=AiReportRead, status_code=status.HTTP_201_CREATED)
def generate_monthly_report(
    data: AiReportGenerateRequest,
    current_user: User = Depends(get_current_user),
    ai_report_service: AiReportService = Depends(get_ai_report_service),
) -> AiReportRead:
    return ai_report_service.generate_monthly_report(
        user_id=current_user.id,
        year=data.year,
        month=data.month,
        force_regenerate=data.force_regenerate,
    )

