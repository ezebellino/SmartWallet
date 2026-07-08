import enum
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class DollarSavingSource(str, enum.Enum):
    manual = "manual"
    bank = "bank"
    mercado_pago = "mercado_pago"
    cash = "cash"
    other = "other"


class DollarSaving(TimestampMixin, Base):
    __tablename__ = "dollar_savings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    source: Mapped[DollarSavingSource] = mapped_column(
        Enum(DollarSavingSource),
        default=DollarSavingSource.manual,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    saved_at: Mapped[date | None] = mapped_column(Date, nullable=True)

    user = relationship("User", back_populates="dollar_savings")
