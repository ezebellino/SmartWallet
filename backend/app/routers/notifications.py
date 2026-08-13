from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.ai_reports import AiReportRepository
from app.repositories.binance import BinanceRepository
from app.repositories.budgets import BudgetRepository
from app.repositories.categories import CategoryRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.saving_goals import SavingGoalRepository
from app.repositories.transactions import TransactionRepository
from app.schemas.notification import NotificationGenerateResponse, NotificationRead
from app.services.binance import BinanceService
from app.services.notifications import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_notification_service(db: Session = Depends(get_db)) -> NotificationService:
    return NotificationService(
        NotificationRepository(db),
        BudgetRepository(db),
        CategoryRepository(db),
        TransactionRepository(db),
        SavingGoalRepository(db),
        AiReportRepository(db),
        BinanceService(db, BinanceRepository(db)),
    )


@router.get("", response_model=list[NotificationRead])
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(default=30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
) -> list[NotificationRead]:
    return notification_service.list_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        limit=limit,
    )


@router.post("/generate", response_model=NotificationGenerateResponse, status_code=status.HTTP_201_CREATED)
def generate_notifications(
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
) -> NotificationGenerateResponse:
    return notification_service.generate_basic(user_id=current_user.id, year=year, month=month)


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
) -> NotificationRead:
    return notification_service.mark_read(notification_id=notification_id, user_id=current_user.id)


@router.patch("/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    notification_service: NotificationService = Depends(get_notification_service),
) -> dict[str, int]:
    return notification_service.mark_all_read(user_id=current_user.id)
