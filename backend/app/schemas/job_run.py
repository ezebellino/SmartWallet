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
