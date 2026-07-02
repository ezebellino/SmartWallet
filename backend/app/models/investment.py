import enum
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class InvestmentAssetType(str, enum.Enum):
    stock = "stock"
    crypto = "crypto"
    bond = "bond"
    cedear = "cedear"
    mutual_fund = "mutual_fund"
    index = "index"
    etf = "etf"
    fixed_term = "fixed_term"
    other = "other"


class InvestmentRiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class InvestmentOperationType(str, enum.Enum):
    buy = "buy"
    sell = "sell"


class InvestmentAsset(TimestampMixin, Base):
    __tablename__ = "investment_assets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    symbol: Mapped[str] = mapped_column(String(30), nullable=False)
    asset_type: Mapped[InvestmentAssetType] = mapped_column(Enum(InvestmentAssetType), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    risk_level: Mapped[InvestmentRiskLevel] = mapped_column(
        Enum(InvestmentRiskLevel),
        default=InvestmentRiskLevel.medium,
        nullable=False,
    )
    current_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 4), nullable=True)

    user = relationship("User", back_populates="investment_assets")
    operations = relationship(
        "InvestmentOperation",
        back_populates="asset",
        cascade="all, delete-orphan",
    )


class InvestmentOperation(TimestampMixin, Base):
    __tablename__ = "investment_operations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("investment_assets.id"), index=True)
    operation_type: Mapped[InvestmentOperationType] = mapped_column(
        Enum(InvestmentOperationType),
        nullable=False,
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    fees: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)
    operation_date: Mapped[date] = mapped_column(Date, nullable=False)

    user = relationship("User", back_populates="investment_operations")
    asset = relationship("InvestmentAsset", back_populates="operations")

