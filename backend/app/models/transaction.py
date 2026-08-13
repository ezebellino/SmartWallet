import enum
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"


class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        UniqueConstraint("user_id", "external_source", "external_id", name="uq_transaction_external_source_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    account_id: Mapped[int | None] = mapped_column(ForeignKey("financial_accounts.id"), index=True, nullable=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), index=True)
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="ARS", nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    external_source: Mapped[str | None] = mapped_column(String(40), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(160), nullable=True)

    user = relationship("User", back_populates="transactions")
    account = relationship("FinancialAccount", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
