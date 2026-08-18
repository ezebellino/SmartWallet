from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JobRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_key: str
    status: str
    started_at: datetime
    finished_at: datetime | None
    duration_ms: int | None
    users_processed: int
    success_count: int
    failure_count: int
    message: str | None
    details: dict | None
    created_at: datetime
    updated_at: datetime


class JobStatusRead(BaseModel):
    job_key: str
    state: str
    interval_minutes: int
    latest_run: JobRunRead | None
    heartbeat_status: str | None = None
    heartbeat_last_seen_at: datetime | None = None
    heartbeat_message: str | None = None
    heartbeat_is_alive: bool = False
    next_run_at: datetime | None
    is_overdue: bool
    message: str
