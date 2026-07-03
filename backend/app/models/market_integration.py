from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin


class MarketIntegrationSetting(TimestampMixin, Base):
    __tablename__ = "market_integration_settings"
    __table_args__ = (UniqueConstraint("user_id", "provider_key", name="uq_market_integration_user_provider"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    provider_key: Mapped[str] = mapped_column(String(40), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    api_key_encrypted: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    api_key_last4: Mapped[str | None] = mapped_column(String(4), nullable=True)

    user = relationship("User", back_populates="market_integration_settings")
