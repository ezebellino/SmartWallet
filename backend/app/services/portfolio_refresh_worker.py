import logging
from collections.abc import Callable
from contextlib import AbstractContextManager
from datetime import datetime, timezone

from sqlalchemy import distinct, select
from sqlalchemy.orm import Session

from app.models.job_run import JobRun
from app.models.market_integration import MarketIntegrationSetting
from app.repositories.ai_reports import AiReportRepository
from app.repositories.binance import BinanceRepository
from app.repositories.budgets import BudgetRepository
from app.repositories.categories import CategoryRepository
from app.repositories.job_runs import JobRunRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.saving_goals import SavingGoalRepository
from app.repositories.transactions import TransactionRepository
from app.services.binance import BINANCE_PROVIDER_KEY, BinanceClient, BinanceService
from app.services.notifications import NotificationService

logger = logging.getLogger(__name__)

PORTFOLIO_REFRESH_JOB_KEY = "portfolio_refresh"


class PortfolioRefreshWorker:
    def __init__(
        self,
        session_factory: Callable[[], AbstractContextManager[Session]],
        binance_client_factory: Callable[[], BinanceClient] | None = None,
    ) -> None:
        self.session_factory = session_factory
        self.binance_client_factory = binance_client_factory or BinanceClient

    def run_once(self) -> JobRun:
        with self.session_factory() as db:
            job_runs = JobRunRepository(db)
            run, timer_started_at = job_runs.start(job_key=PORTFOLIO_REFRESH_JOB_KEY)
            user_ids = self._list_user_ids_with_binance(db)
            details: dict[str, object] = {"users": []}
            success_count = 0
            failure_count = 0

            if not user_ids:
                return job_runs.finish(
                    run,
                    timer_started_at=timer_started_at,
                    status="success",
                    message="No Binance users configured",
                    users_processed=0,
                    success_count=0,
                    failure_count=0,
                    details=details,
                )

            for user_id in user_ids:
                try:
                    result = self._refresh_user(db, user_id)
                    success_count += 1
                    details["users"].append({"user_id": user_id, **result})  # type: ignore[index]
                except Exception as error:
                    failure_count += 1
                    details["users"].append(  # type: ignore[index]
                        {"user_id": user_id, "status": "failed", "error": str(error)[:500]}
                    )

            status = "success" if failure_count == 0 else "partial_success" if success_count else "failed"
            message = (
                f"users={len(user_ids)}, success={success_count}, failed={failure_count}"
            )
            return job_runs.finish(
                run,
                timer_started_at=timer_started_at,
                status=status,
                message=message,
                users_processed=len(user_ids),
                success_count=success_count,
                failure_count=failure_count,
                details=details,
            )

    def _refresh_user(self, db: Session, user_id: int) -> dict[str, object]:
        binance_service = BinanceService(db, BinanceRepository(db), self.binance_client_factory())
        sync_response = binance_service.sync_balances(user_id)
        portfolio_summary = binance_service.get_portfolio_summary(user_id)
        now = datetime.now(timezone.utc)
        notification_service = NotificationService(
            NotificationRepository(db),
            BudgetRepository(db),
            CategoryRepository(db),
            TransactionRepository(db),
            SavingGoalRepository(db),
            AiReportRepository(db),
            binance_service,
        )
        notification_response = notification_service.generate_binance_alerts(
            user_id=user_id,
            year=now.year,
            month=now.month,
        )
        return {
            "status": "success",
            "synced_count": sync_response.synced_count,
            "portfolio_value_usd": str(portfolio_summary.total_estimated_value_usd),
            "priced_asset_count": portfolio_summary.priced_asset_count,
            "unpriced_asset_count": portfolio_summary.unpriced_asset_count,
            "notifications_generated_count": notification_response.generated_count,
        }

    def _list_user_ids_with_binance(self, db: Session) -> list[int]:
        statement = (
            select(distinct(MarketIntegrationSetting.user_id))
            .where(
                MarketIntegrationSetting.provider_key == BINANCE_PROVIDER_KEY,
                MarketIntegrationSetting.enabled.is_(True),
                MarketIntegrationSetting.api_key_encrypted.is_not(None),
            )
            .order_by(MarketIntegrationSetting.user_id)
        )
        return list(db.scalars(statement).all())
