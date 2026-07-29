import asyncio
import contextlib
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import distinct, select
from sqlalchemy.orm import Session, sessionmaker

from app.models.investment import InvestmentAsset
from app.models.market_data_sync import MarketDataSyncRun
from app.repositories.investments import InvestmentRepository
from app.services.market_data import MarketDataService

logger = logging.getLogger(__name__)


MARKET_DATA_REFRESH_JOB_KEY = "market-data-auto-refresh"


class MarketDataAutoRefreshRunner:
    def __init__(
        self,
        session_factory: sessionmaker[Session],
        interval_minutes: int,
    ) -> None:
        self.session_factory = session_factory
        self.interval = timedelta(minutes=interval_minutes)

    def run_if_due(self, *, force: bool = False) -> MarketDataSyncRun:
        with self.session_factory() as db:
            sync_run = self._get_or_create_sync_run(db)
            now = datetime.now(timezone.utc)

            if not force and not self._is_due(sync_run, now):
                return sync_run

            sync_run.status = "running"
            sync_run.last_started_at = now
            sync_run.last_message = "Market data refresh started"
            db.commit()

            try:
                user_ids = self._list_user_ids_with_assets(db)
                if not user_ids:
                    return self._mark_success(db, sync_run, "No investment assets configured")

                messages: list[str] = []
                for user_id in user_ids:
                    try:
                        response = MarketDataService(InvestmentRepository(db)).refresh_investment_prices(user_id)
                        messages.append(
                            (
                                f"user={user_id}: updated={response.updated_count}, "
                                f"skipped={response.skipped_count}, failed={response.failed_count}"
                            )
                        )
                    except Exception as error:
                        logger.exception("Market data auto refresh failed for user_id=%s", user_id)
                        messages.append(f"user={user_id}: failed={error}")

                return self._mark_success(db, sync_run, "; ".join(messages))
            except Exception as error:
                logger.exception("Market data auto refresh failed")
                sync_run.status = "failed"
                sync_run.last_finished_at = datetime.now(timezone.utc)
                sync_run.last_message = str(error)
                db.commit()
                db.refresh(sync_run)
                return sync_run

    def _get_or_create_sync_run(self, db: Session) -> MarketDataSyncRun:
        statement = select(MarketDataSyncRun).where(MarketDataSyncRun.job_key == MARKET_DATA_REFRESH_JOB_KEY)
        sync_run = db.scalar(statement)
        if sync_run:
            return sync_run

        sync_run = MarketDataSyncRun(job_key=MARKET_DATA_REFRESH_JOB_KEY, status="idle")
        db.add(sync_run)
        db.commit()
        db.refresh(sync_run)
        return sync_run

    def _is_due(self, sync_run: MarketDataSyncRun, now: datetime) -> bool:
        last_finished_at = self._as_aware_utc(sync_run.last_finished_at)
        if last_finished_at is None:
            return True
        return now - last_finished_at >= self.interval

    def _as_aware_utc(self, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def _list_user_ids_with_assets(self, db: Session) -> list[int]:
        statement = select(distinct(InvestmentAsset.user_id)).order_by(InvestmentAsset.user_id)
        return list(db.scalars(statement).all())

    def _mark_success(self, db: Session, sync_run: MarketDataSyncRun, message: str) -> MarketDataSyncRun:
        now = datetime.now(timezone.utc)
        sync_run.status = "success"
        sync_run.last_finished_at = now
        sync_run.last_success_at = now
        sync_run.last_message = message[:2000]
        db.commit()
        db.refresh(sync_run)
        return sync_run


class MarketDataAutoRefreshScheduler:
    def __init__(
        self,
        runner: MarketDataAutoRefreshRunner,
        interval_minutes: int,
        startup_delay_seconds: float,
    ) -> None:
        self.runner = runner
        self.interval_seconds = max(interval_minutes * 60, 60)
        self.startup_delay_seconds = max(startup_delay_seconds, 0)
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        if not self._task:
            return
        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task
        self._task = None

    async def _run_loop(self) -> None:
        await asyncio.sleep(self.startup_delay_seconds)
        while True:
            try:
                await asyncio.to_thread(self.runner.run_if_due)
            except Exception:
                logger.exception("Market data scheduler loop failed")
            await asyncio.sleep(self.interval_seconds)
