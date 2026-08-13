from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class BinanceBalanceSnapshot(TimestampMixin, Base):
    __tablename__ = "binance_balance_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    asset: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    free: Mapped[Decimal] = mapped_column(Numeric(24, 10), nullable=False)
    locked: Mapped[Decimal] = mapped_column(Numeric(24, 10), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(24, 10), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    user = relationship("User", back_populates="binance_balance_snapshots")
