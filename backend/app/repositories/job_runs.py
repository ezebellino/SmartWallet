from datetime import datetime, timezone
from time import perf_counter

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.job_run import JobRun


class JobRunRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def start(self, *, job_key: str) -> tuple[JobRun, float]:
        started_at = datetime.now(timezone.utc)
        run = JobRun(job_key=job_key, status="running", started_at=started_at)
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run, perf_counter()

    def finish(
        self,
        run: JobRun,
        *,
        timer_started_at: float,
        status: str,
        message: str,
        users_processed: int,
        success_count: int,
        failure_count: int,
        details: dict | None = None,
    ) -> JobRun:
        run.status = status
        run.finished_at = datetime.now(timezone.utc)
        run.duration_ms = max(int((perf_counter() - timer_started_at) * 1000), 0)
        run.users_processed = users_processed
        run.success_count = success_count
        run.failure_count = failure_count
        run.message = message[:4000]
        run.details = details
        self.db.commit()
        self.db.refresh(run)
        return run

    def list_recent(self, *, job_key: str | None = None, limit: int = 20) -> list[JobRun]:
        statement = select(JobRun).order_by(JobRun.started_at.desc(), JobRun.id.desc()).limit(limit)
        if job_key:
            statement = statement.where(JobRun.job_key == job_key)
        return list(self.db.scalars(statement).all())
