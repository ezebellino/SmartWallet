import logging
from collections.abc import Callable
from contextlib import AbstractContextManager
from datetime import datetime, timedelta, timezone

from sqlalchemy import distinct, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.job_run import JobRun
from app.models.market_integration import MarketIntegrationSetting
from app.repositories.job_runs import JobRunRepository
from app.services.mercado_pago import PROVIDER_KEY, MercadoPagoProvider, MercadoPagoService

logger = logging.getLogger(__name__)

MERCADO_PAGO_SYNC_JOB_KEY = "mercado_pago_sync"


class MercadoPagoSyncWorker:
    def __init__(
        self,
        session_factory: Callable[[], AbstractContextManager[Session]],
        provider_factory: Callable[[], MercadoPagoProvider] | None = None,
        lookback_days: int | None = None,
    ) -> None:
        self.session_factory = session_factory
        self.provider_factory = provider_factory or MercadoPagoProvider
        self.lookback_days = max(lookback_days or settings.mercado_pago_sync_lookback_days, 1)

    def run_once(self) -> JobRun:
        with self.session_factory() as db:
            job_runs = JobRunRepository(db)
            run, timer_started_at = job_runs.start(job_key=MERCADO_PAGO_SYNC_JOB_KEY)
            user_ids = self._list_user_ids_with_mercado_pago(db)
            details: dict[str, object] = {"lookback_days": self.lookback_days, "users": []}
            success_count = 0
            failure_count = 0

            if not user_ids:
                return job_runs.finish(
                    run,
                    timer_started_at=timer_started_at,
                    status="success",
                    message="No Mercado Pago users configured",
                    users_processed=0,
                    success_count=0,
                    failure_count=0,
                    details=details,
                )

            for user_id in user_ids:
                try:
                    result = self._sync_user(db, user_id)
                    success_count += 1
                    details["users"].append({"user_id": user_id, **result})  # type: ignore[index]
                except Exception as error:
                    logger.exception("Mercado Pago sync failed for user_id=%s", user_id)
                    failure_count += 1
                    details["users"].append(  # type: ignore[index]
                        {"user_id": user_id, "status": "failed", "error": str(error)[:500]}
                    )

            status = "success" if failure_count == 0 else "partial_success" if success_count else "failed"
            message = f"users={len(user_ids)}, success={success_count}, failed={failure_count}"
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

    def _sync_user(self, db: Session, user_id: int) -> dict[str, object]:
        today = datetime.now(timezone.utc).date()
        begin_date = today - timedelta(days=self.lookback_days - 1)
        response = MercadoPagoService(db, provider=self.provider_factory()).sync_movements(
            user_id=user_id,
            begin_date=begin_date,
            end_date=today,
        )
        import_result = response.import_result
        return {
            "status": response.status,
            "begin_date": begin_date.isoformat(),
            "end_date": today.isoformat(),
            "report_requested": response.report_requested,
            "available_reports": response.available_reports,
            "imported_count": import_result.imported_count if import_result else 0,
            "skipped_count": import_result.skipped_count if import_result else 0,
            "failed_count": import_result.failed_count if import_result else 0,
            "file_name": import_result.file_name if import_result else None,
        }

    def _list_user_ids_with_mercado_pago(self, db: Session) -> list[int]:
        statement = (
            select(distinct(MarketIntegrationSetting.user_id))
            .where(
                MarketIntegrationSetting.provider_key == PROVIDER_KEY,
                MarketIntegrationSetting.enabled.is_(True),
                MarketIntegrationSetting.api_key_encrypted.is_not(None),
            )
            .order_by(MarketIntegrationSetting.user_id)
        )
        return list(db.scalars(statement).all())
