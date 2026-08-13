import enum

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class NotificationType(str, enum.Enum):
    budget_near_limit = "budget_near_limit"
    budget_exceeded = "budget_exceeded"
    ai_report_pending = "ai_report_pending"
    goal_without_contribution = "goal_without_contribution"
    binance_portfolio_alert = "binance_portfolio_alert"


class NotificationPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Notification(TimestampMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (UniqueConstraint("user_id", "dedupe_key", name="uq_notification_user_dedupe_key"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), nullable=False, index=True)
    priority: Mapped[NotificationPriority] = mapped_column(Enum(NotificationPriority), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    action_label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    action_section: Mapped[str | None] = mapped_column(String(40), nullable=True)
    dedupe_key: Mapped[str] = mapped_column(String(180), nullable=False)
    period_year: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    period_month: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    user = relationship("User", back_populates="notifications")
