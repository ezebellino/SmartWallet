from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class AiReport(TimestampMixin, Base):
    __tablename__ = "ai_reports"
    __table_args__ = (
        UniqueConstraint("user_id", "period_year", "period_month", name="uq_ai_report_user_period"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    provider: Mapped[str] = mapped_column(String(80), default="stub", nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(40), default="monthly-report-v1", nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    recommendations: Mapped[str] = mapped_column(Text, nullable=False)
    risk_warnings: Mapped[str] = mapped_column(Text, nullable=False)

    user = relationship("User", back_populates="ai_reports")
