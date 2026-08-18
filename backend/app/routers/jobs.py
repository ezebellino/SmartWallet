import contextlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.database.session import get_db
from app.models.user import User
from app.repositories.job_runs import JobRunRepository
from app.repositories.worker_heartbeats import WorkerHeartbeatRepository
from app.schemas.job_run import JobRunRead, JobStatusRead
from app.services.portfolio_refresh_worker import PORTFOLIO_REFRESH_JOB_KEY, PortfolioRefreshWorker

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/runs", response_model=list[JobRunRead])
def list_job_runs(
    job_key: str | None = Query(default=None, max_length=80),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[JobRunRead]:
    return JobRunRepository(db).list_recent(job_key=job_key, limit=limit)


@router.get("/portfolio-refresh/status", response_model=JobStatusRead)
def portfolio_refresh_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobStatusRead:
    del current_user
    interval_minutes = max(settings.worker_interval_minutes, 1)
    now = datetime.now(timezone.utc)
    latest_run = JobRunRepository(db).latest(job_key=PORTFOLIO_REFRESH_JOB_KEY)
    heartbeat = WorkerHeartbeatRepository(db).get(job_key=PORTFOLIO_REFRESH_JOB_KEY)
    heartbeat_alive_until = (
        heartbeat.last_seen_at + timedelta(minutes=interval_minutes * 2)
        if heartbeat
        else None
    )
    heartbeat_is_alive = heartbeat_alive_until is not None and now <= heartbeat_alive_until

    if not latest_run:
        return JobStatusRead(
            job_key=PORTFOLIO_REFRESH_JOB_KEY,
            state="alive" if heartbeat_is_alive else "never_run",
            interval_minutes=interval_minutes,
            latest_run=None,
            heartbeat_status=heartbeat.status if heartbeat else None,
            heartbeat_last_seen_at=heartbeat.last_seen_at if heartbeat else None,
            heartbeat_message=heartbeat.last_message if heartbeat else None,
            heartbeat_is_alive=heartbeat_is_alive,
            next_run_at=None,
            is_overdue=False,
            message=(
                "The portfolio worker is alive, but no refresh runs have been recorded yet."
                if heartbeat_is_alive
                else "No portfolio refresh runs have been recorded yet."
            ),
        )

    if latest_run.status == "running":
        return JobStatusRead(
            job_key=PORTFOLIO_REFRESH_JOB_KEY,
            state="running",
            interval_minutes=interval_minutes,
            latest_run=latest_run,
            heartbeat_status=heartbeat.status if heartbeat else None,
            heartbeat_last_seen_at=heartbeat.last_seen_at if heartbeat else None,
            heartbeat_message=heartbeat.last_message if heartbeat else None,
            heartbeat_is_alive=heartbeat_is_alive,
            next_run_at=None,
            is_overdue=False,
            message="A portfolio refresh run is currently in progress.",
        )

    finished_at = latest_run.finished_at or latest_run.started_at
    next_run_at = finished_at + timedelta(minutes=interval_minutes)
    grace_until = next_run_at + timedelta(minutes=interval_minutes)
    is_overdue = now > grace_until
    state = "alive" if heartbeat_is_alive else "overdue" if is_overdue else "scheduled"
    message = (
        "The portfolio worker process is alive."
        if heartbeat_is_alive
        else "The portfolio worker has not recorded a run in the expected window."
        if is_overdue
        else "The next portfolio refresh is expected on schedule, but no live heartbeat was detected."
    )

    return JobStatusRead(
        job_key=PORTFOLIO_REFRESH_JOB_KEY,
        state=state,
        interval_minutes=interval_minutes,
        latest_run=latest_run,
        heartbeat_status=heartbeat.status if heartbeat else None,
        heartbeat_last_seen_at=heartbeat.last_seen_at if heartbeat else None,
        heartbeat_message=heartbeat.last_message if heartbeat else None,
        heartbeat_is_alive=heartbeat_is_alive,
        next_run_at=next_run_at,
        is_overdue=is_overdue,
        message=message,
    )


@router.post("/portfolio-refresh/run", response_model=JobRunRead)
def run_portfolio_refresh(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobRunRead:
    worker = PortfolioRefreshWorker(lambda: contextlib.nullcontext(db))
    return worker.run_once()
