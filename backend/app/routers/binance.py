from datetime import datetime

from fastapi import APIRouter, Depends, Query
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
from app.schemas.binance import (
    BinanceAccountRead,
    BinanceBalanceSnapshotRead,
    BinanceIntegrationRead,
    BinanceIntegrationUpdate,
    BinancePortfolioSummary,
    BinanceSyncResponse,
)
from app.services.binance import BinanceService
from app.services.notifications import NotificationService

router = APIRouter(prefix="/binance", tags=["binance"])


def get_binance_service(db: Session = Depends(get_db)) -> BinanceService:
    return BinanceService(db, BinanceRepository(db))


def get_binance_notification_service(
    db: Session = Depends(get_db),
    binance_service: BinanceService = Depends(get_binance_service),
) -> NotificationService:
    return NotificationService(
        NotificationRepository(db),
        BudgetRepository(db),
        CategoryRepository(db),
        TransactionRepository(db),
        SavingGoalRepository(db),
        AiReportRepository(db),
        binance_service,
    )


@router.get("/integration", response_model=BinanceIntegrationRead)
def get_integration(
    current_user: User = Depends(get_current_user),
    binance_service: BinanceService = Depends(get_binance_service),
) -> BinanceIntegrationRead:
    return binance_service.get_integration(current_user.id)


@router.patch("/integration", response_model=BinanceIntegrationRead)
def update_integration(
    data: BinanceIntegrationUpdate,
    current_user: User = Depends(get_current_user),
    binance_service: BinanceService = Depends(get_binance_service),
) -> BinanceIntegrationRead:
    return binance_service.update_integration(current_user.id, data)


@router.get("/account", response_model=BinanceAccountRead)
def get_account(
    current_user: User = Depends(get_current_user),
    binance_service: BinanceService = Depends(get_binance_service),
) -> BinanceAccountRead:
    return binance_service.get_account(current_user.id)


@router.post("/sync-balances", response_model=BinanceSyncResponse)
def sync_balances(
    current_user: User = Depends(get_current_user),
    binance_service: BinanceService = Depends(get_binance_service),
    notification_service: NotificationService = Depends(get_binance_notification_service),
) -> BinanceSyncResponse:
    response = binance_service.sync_balances(current_user.id)
    now = datetime.now()
    notifications = notification_service.generate_binance_alerts(
        user_id=current_user.id,
        year=now.year,
        month=now.month,
    )
    return response.model_copy(update={"notifications_generated_count": notifications.generated_count})


@router.get("/portfolio-summary", response_model=BinancePortfolioSummary)
def get_portfolio_summary(
    current_user: User = Depends(get_current_user),
    binance_service: BinanceService = Depends(get_binance_service),
) -> BinancePortfolioSummary:
    return binance_service.get_portfolio_summary(current_user.id)


@router.get("/balance-snapshots", response_model=list[BinanceBalanceSnapshotRead])
def list_balance_snapshots(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    binance_service: BinanceService = Depends(get_binance_service),
) -> list[BinanceBalanceSnapshotRead]:
    return binance_service.list_snapshots(user_id=current_user.id, limit=limit)
