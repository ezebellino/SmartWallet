from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.worker_heartbeat import WorkerHeartbeat


class WorkerHeartbeatRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, *, job_key: str) -> WorkerHeartbeat | None:
        return self.db.get(WorkerHeartbeat, job_key)

    def beat(self, *, job_key: str, status: str, message: str | None = None) -> WorkerHeartbeat:
        now = datetime.now(timezone.utc)
        heartbeat = self.get(job_key=job_key)
        if heartbeat is None:
            heartbeat = WorkerHeartbeat(
                job_key=job_key,
                status=status,
                last_seen_at=now,
                last_started_at=now if status == "starting" else None,
                last_message=message,
            )
            self.db.add(heartbeat)
        else:
            heartbeat.status = status
            heartbeat.last_seen_at = now
            heartbeat.last_message = message
            if status == "starting":
                heartbeat.last_started_at = now

        self.db.commit()
        self.db.refresh(heartbeat)
        return heartbeat
