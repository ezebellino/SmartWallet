import contextlib

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories.job_runs import JobRunRepository
from app.schemas.job_run import JobRunRead
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


@router.post("/portfolio-refresh/run", response_model=JobRunRead)
def run_portfolio_refresh(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobRunRead:
    worker = PortfolioRefreshWorker(lambda: contextlib.nullcontext(db))
    return worker.run_once()
