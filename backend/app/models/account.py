import enum
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class AccountType(str, enum.Enum):
    bank = "bank"
    wallet = "wallet"
    cash = "cash"
    investment = "investment"
    other = "other"


class FinancialAccount(TimestampMixin, Base):
    __tablename__ = "financial_accounts"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_financial_account_user_name"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[AccountType] = mapped_column(Enum(AccountType), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="ARS", nullable=False)
    institution: Mapped[str | None] = mapped_column(String(120), nullable=True)
    color: Mapped[str] = mapped_column(String(20), default="#38bdf8", nullable=False)
    icon: Mapped[str] = mapped_column(String(40), default="wallet", nullable=False)
    initial_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="financial_accounts")
    transactions = relationship("Transaction", back_populates="account")
    transfers_out = relationship(
        "AccountTransfer",
        back_populates="from_account",
        foreign_keys="AccountTransfer.from_account_id",
    )
    transfers_in = relationship(
        "AccountTransfer",
        back_populates="to_account",
        foreign_keys="AccountTransfer.to_account_id",
    )


class AccountTransfer(TimestampMixin, Base):
    __tablename__ = "account_transfers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    from_account_id: Mapped[int] = mapped_column(ForeignKey("financial_accounts.id"), index=True, nullable=False)
    to_account_id: Mapped[int] = mapped_column(ForeignKey("financial_accounts.id"), index=True, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="ARS", nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    transfer_date: Mapped[date] = mapped_column(Date, nullable=False)

    user = relationship("User", back_populates="account_transfers")
    from_account = relationship(
        "FinancialAccount",
        back_populates="transfers_out",
        foreign_keys=[from_account_id],
    )
    to_account = relationship(
        "FinancialAccount",
        back_populates="transfers_in",
        foreign_keys=[to_account_id],
    )
