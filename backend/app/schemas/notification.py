from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationPriority, NotificationType


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: NotificationType
    priority: NotificationPriority
    title: str
    message: str
    action_label: str | None
    action_section: str | None
    period_year: int | None
    period_month: int | None
    is_read: bool
    created_at: datetime
    updated_at: datetime


class NotificationGenerateResponse(BaseModel):
    generated_count: int
    notifications: list[NotificationRead]
