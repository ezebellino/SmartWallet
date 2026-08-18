import argparse
import logging
import time

from app.core.config import settings
from app.database.session import SessionLocal
from app.repositories.worker_heartbeats import WorkerHeartbeatRepository
from app.services.portfolio_refresh_worker import PORTFOLIO_REFRESH_JOB_KEY, PortfolioRefreshWorker

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Smart Wallet worker")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run a job once")
    run_parser.add_argument("job_key", choices=[PORTFOLIO_REFRESH_JOB_KEY])

    loop_parser = subparsers.add_parser("loop", help="Run a job forever on an interval")
    loop_parser.add_argument("job_key", choices=[PORTFOLIO_REFRESH_JOB_KEY])
    loop_parser.add_argument("--interval-minutes", type=int, default=settings.worker_interval_minutes)
    loop_parser.add_argument("--startup-delay-seconds", type=float, default=settings.worker_startup_delay_seconds)
    return parser


def run_job(job_key: str) -> None:
    if job_key != PORTFOLIO_REFRESH_JOB_KEY:
        raise ValueError(f"Unknown job: {job_key}")
    run = PortfolioRefreshWorker(SessionLocal).run_once()
    logger.info(
        "job=%s status=%s users=%s success=%s failed=%s message=%s",
        run.job_key,
        run.status,
        run.users_processed,
        run.success_count,
        run.failure_count,
        run.message,
    )


def write_heartbeat(job_key: str, status: str, message: str | None = None) -> None:
    with SessionLocal() as db:
        WorkerHeartbeatRepository(db).beat(job_key=job_key, status=status, message=message)


def loop_job(job_key: str, *, interval_minutes: int, startup_delay_seconds: float) -> None:
    interval_seconds = max(interval_minutes * 60, 60)
    delay_seconds = max(startup_delay_seconds, 0)
    write_heartbeat(job_key, "starting", f"interval={interval_minutes}m")
    if delay_seconds:
        logger.info("Worker startup delay: %.1fs", delay_seconds)
        time.sleep(delay_seconds)

    while True:
        try:
            write_heartbeat(job_key, "running", "Executing portfolio refresh")
            run_job(job_key)
            write_heartbeat(job_key, "sleeping", f"Sleeping for {interval_minutes} minutes")
        except Exception:
            logger.exception("Worker job failed outside tracked execution")
            write_heartbeat(job_key, "error", "Worker job failed outside tracked execution")
        time.sleep(interval_seconds)


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "run":
        run_job(args.job_key)
    elif args.command == "loop":
        loop_job(
            args.job_key,
            interval_minutes=args.interval_minutes,
            startup_delay_seconds=args.startup_delay_seconds,
        )


if __name__ == "__main__":
    main()
