import contextlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.database.session import get_db
from app.models.user import User
from app.models.job_run import JobRun
from app.models.market_integration import MarketIntegrationSetting
from app.repositories.job_runs import JobRunRepository
from app.repositories.worker_heartbeats import WorkerHeartbeatRepository
from app.schemas.job_run import JobRunRead, JobStatusRead
from app.services.mercado_pago import PROVIDER_KEY as MERCADO_PAGO_PROVIDER_KEY
from app.services.mercado_pago_sync_worker import MERCADO_PAGO_SYNC_JOB_KEY, MercadoPagoSyncWorker
from app.services.binance import BINANCE_PROVIDER_KEY
from app.services.portfolio_refresh_worker import PORTFOLIO_REFRESH_JOB_KEY, PortfolioRefreshWorker

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/runs", response_model=list[JobRunRead])
def list_job_runs(
    job_key: str | None = Query(default=None, max_length=80),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[JobRunRead]:
    runs = JobRunRepository(db).list_recent(job_key=job_key, limit=500)
    return [
        _run_for_user(run, current_user.id)
        for run in runs
        if _user_detail(run, current_user.id) is not None
    ][:limit]


@router.get("/portfolio-refresh/status", response_model=JobStatusRead)
def portfolio_refresh_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobStatusRead:
    return _build_job_status(
        db=db,
        current_user=current_user,
        job_key=PORTFOLIO_REFRESH_JOB_KEY,
        job_label="portfolio refresh",
    )


@router.get("/mercado-pago-sync/status", response_model=JobStatusRead)
def mercado_pago_sync_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobStatusRead:
    return _build_job_status(
        db=db,
        current_user=current_user,
        job_key=MERCADO_PAGO_SYNC_JOB_KEY,
        job_label="Mercado Pago sync",
    )


def _build_job_status(*, db: Session, current_user: User, job_key: str, job_label: str) -> JobStatusRead:
    interval_minutes = max(settings.worker_interval_minutes, 1)
    now = datetime.now(timezone.utc)
    latest_run = next(
        (
            run for run in JobRunRepository(db).list_recent(job_key=job_key, limit=500)
            if _user_detail(run, current_user.id) is not None
        ),
        None,
    )
    visible_run = _run_for_user(latest_run, current_user.id) if latest_run else None
    heartbeat = WorkerHeartbeatRepository(db).get(job_key=job_key)
    heartbeat_last_seen_at = _ensure_aware(heartbeat.last_seen_at) if heartbeat else None
    heartbeat_alive_until = (
        heartbeat_last_seen_at + timedelta(minutes=interval_minutes * 2)
        if heartbeat
        else None
    )
    heartbeat_is_alive = heartbeat_alive_until is not None and now <= heartbeat_alive_until

    if not latest_run:
        return JobStatusRead(
            job_key=job_key,
            state="alive" if heartbeat_is_alive else "never_run",
            interval_minutes=interval_minutes,
            latest_run=None,
            heartbeat_status=heartbeat.status if heartbeat else None,
            heartbeat_last_seen_at=heartbeat_last_seen_at,
            heartbeat_message=None,
            heartbeat_is_alive=heartbeat_is_alive,
            next_run_at=None,
            is_overdue=False,
            message=(
                f"The {job_label} worker is alive, but no runs have been recorded yet."
                if heartbeat_is_alive
                else f"No {job_label} runs have been recorded yet."
            ),
        )

    if latest_run.status == "running":
        return JobStatusRead(
            job_key=job_key,
            state="running",
            interval_minutes=interval_minutes,
            latest_run=visible_run,
            heartbeat_status=heartbeat.status if heartbeat else None,
            heartbeat_last_seen_at=heartbeat_last_seen_at,
            heartbeat_message=None,
            heartbeat_is_alive=heartbeat_is_alive,
            next_run_at=None,
            is_overdue=False,
            message=f"A {job_label} run is currently in progress.",
        )

    finished_at = _ensure_aware(latest_run.finished_at or latest_run.started_at)
    next_run_at = finished_at + timedelta(minutes=interval_minutes)
    grace_until = next_run_at + timedelta(minutes=interval_minutes)
    is_overdue = now > grace_until
    state = "alive" if heartbeat_is_alive else "overdue" if is_overdue else "scheduled"
    message = (
        f"The {job_label} worker process is alive."
        if heartbeat_is_alive
        else f"The {job_label} worker has not recorded a run in the expected window."
        if is_overdue
        else f"The next {job_label} run is expected on schedule, but no live heartbeat was detected."
    )

    return JobStatusRead(
        job_key=job_key,
        state=state,
        interval_minutes=interval_minutes,
        latest_run=visible_run,
        heartbeat_status=heartbeat.status if heartbeat else None,
        heartbeat_last_seen_at=heartbeat_last_seen_at,
        heartbeat_message=None,
        heartbeat_is_alive=heartbeat_is_alive,
        next_run_at=next_run_at,
        is_overdue=is_overdue,
        message=message,
    )


def _ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _user_detail(run: JobRun, user_id: int) -> dict | None:
    users = (run.details or {}).get("users", [])
    if not isinstance(users, list):
        return None
    return next(
        (item for item in users if isinstance(item, dict) and item.get("user_id") == user_id),
        None,
    )


def _run_for_user(run: JobRun, user_id: int) -> JobRunRead:
    detail = _user_detail(run, user_id)
    if detail is None:
        raise ValueError("Job run does not belong to user")
    succeeded = detail.get("status") not in {"failed", "error"}
    visible_detail = {key: value for key, value in detail.items() if key != "error"}
    if not succeeded:
        visible_detail["error"] = "Worker failed; check server logs"
    return JobRunRead.model_validate(run).model_copy(
        update={
            "status": "success" if succeeded else "failed",
            "users_processed": 1,
            "success_count": int(succeeded),
            "failure_count": int(not succeeded),
            "message": "Your job run completed" if succeeded else "Your job run failed",
            "details": {"users": [visible_detail]},
        }
    )


def _require_integration(db: Session, user_id: int, provider_key: str) -> None:
    setting = db.scalar(
        select(MarketIntegrationSetting).where(
            MarketIntegrationSetting.user_id == user_id,
            MarketIntegrationSetting.provider_key == provider_key,
            MarketIntegrationSetting.enabled.is_(True),
            MarketIntegrationSetting.api_key_encrypted.is_not(None),
        )
    )
    if setting is None:
        raise HTTPException(status_code=400, detail="Integration is not configured")


@router.post("/portfolio-refresh/run", response_model=JobRunRead)
def run_portfolio_refresh(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobRunRead:
    _require_integration(db, current_user.id, BINANCE_PROVIDER_KEY)
    worker = PortfolioRefreshWorker(lambda: contextlib.nullcontext(db))
    run = worker.run_once(user_id=current_user.id)
    if _user_detail(run, current_user.id) is None:
        raise HTTPException(status_code=409, detail="Integration changed; retry the job")
    return _run_for_user(run, current_user.id)


@router.post("/mercado-pago-sync/run", response_model=JobRunRead)
def run_mercado_pago_sync(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobRunRead:
    _require_integration(db, current_user.id, MERCADO_PAGO_PROVIDER_KEY)
    worker = MercadoPagoSyncWorker(lambda: contextlib.nullcontext(db))
    run = worker.run_once(user_id=current_user.id)
    if _user_detail(run, current_user.id) is None:
        raise HTTPException(status_code=409, detail="Integration changed; retry the job")
    return _run_for_user(run, current_user.id)
