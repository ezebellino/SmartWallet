from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_by_user(self, *, user_id: int, unread_only: bool = False, limit: int = 50) -> list[Notification]:
        statement = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.is_read.asc(), Notification.created_at.desc(), Notification.id.desc())
            .limit(limit)
        )
        if unread_only:
            statement = statement.where(Notification.is_read.is_(False))
        return list(self.db.scalars(statement).all())

    def get_by_id(self, *, notification_id: int, user_id: int) -> Notification | None:
        statement = select(Notification).where(Notification.id == notification_id, Notification.user_id == user_id)
        return self.db.scalar(statement)

    def create_many_skip_duplicates(self, notifications: Iterable[Notification]) -> list[Notification]:
        created: list[Notification] = []
        for notification in notifications:
            self.db.add(notification)
            try:
                self.db.commit()
            except IntegrityError:
                self.db.rollback()
                continue
            self.db.refresh(notification)
            created.append(notification)
        return created

    def mark_read(self, notification: Notification) -> Notification:
        notification.is_read = True
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_all_read(self, *, user_id: int) -> int:
        notifications = self.list_by_user(user_id=user_id, unread_only=True, limit=500)
        for notification in notifications:
            notification.is_read = True
        self.db.commit()
        return len(notifications)
