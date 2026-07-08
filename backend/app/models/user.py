from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    saving_goals = relationship("SavingGoal", back_populates="user", cascade="all, delete-orphan")
    dollar_savings = relationship("DollarSaving", back_populates="user", cascade="all, delete-orphan")
    investment_assets = relationship(
        "InvestmentAsset",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    investment_operations = relationship(
        "InvestmentOperation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    investment_price_snapshots = relationship(
        "InvestmentPriceSnapshot",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    ai_reports = relationship("AiReport", back_populates="user", cascade="all, delete-orphan")
    market_integration_settings = relationship(
        "MarketIntegrationSetting",
        back_populates="user",
        cascade="all, delete-orphan",
    )
