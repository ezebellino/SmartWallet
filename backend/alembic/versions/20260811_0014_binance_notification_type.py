"""add binance notification type

Revision ID: 20260811_0014
Revises: 20260811_0013
Create Date: 2026-08-11 20:25:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260811_0014"
down_revision: str | None = "20260811_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'binance_portfolio_alert'")


def downgrade() -> None:
    # PostgreSQL enum values cannot be removed safely without rebuilding the type.
    pass
