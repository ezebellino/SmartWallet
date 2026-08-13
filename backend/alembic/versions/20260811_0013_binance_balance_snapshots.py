"""add binance balance snapshots

Revision ID: 20260811_0013
Revises: 20260811_0012
Create Date: 2026-08-11 12:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260811_0013"
down_revision: str | None = "20260811_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "binance_balance_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("asset", sa.String(length=20), nullable=False),
        sa.Column("free", sa.Numeric(24, 10), nullable=False),
        sa.Column("locked", sa.Numeric(24, 10), nullable=False),
        sa.Column("total", sa.Numeric(24, 10), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_binance_balance_snapshots_asset"), "binance_balance_snapshots", ["asset"], unique=False)
    op.create_index(
        op.f("ix_binance_balance_snapshots_fetched_at"),
        "binance_balance_snapshots",
        ["fetched_at"],
        unique=False,
    )
    op.create_index(op.f("ix_binance_balance_snapshots_id"), "binance_balance_snapshots", ["id"], unique=False)
    op.create_index(op.f("ix_binance_balance_snapshots_user_id"), "binance_balance_snapshots", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_binance_balance_snapshots_user_id"), table_name="binance_balance_snapshots")
    op.drop_index(op.f("ix_binance_balance_snapshots_id"), table_name="binance_balance_snapshots")
    op.drop_index(op.f("ix_binance_balance_snapshots_fetched_at"), table_name="binance_balance_snapshots")
    op.drop_index(op.f("ix_binance_balance_snapshots_asset"), table_name="binance_balance_snapshots")
    op.drop_table("binance_balance_snapshots")
