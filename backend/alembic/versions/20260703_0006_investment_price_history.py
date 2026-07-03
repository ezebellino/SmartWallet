"""Add investment price history

Revision ID: 20260703_0006
Revises: 20260701_0005
Create Date: 2026-07-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260703_0006"
down_revision: str | None = "20260701_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("investment_assets", sa.Column("price_source", sa.String(length=40), nullable=True))
    op.add_column(
        "investment_assets",
        sa.Column("price_updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "investment_price_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("price", sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["asset_id"], ["investment_assets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_investment_price_snapshots_asset_id"),
        "investment_price_snapshots",
        ["asset_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_investment_price_snapshots_id"),
        "investment_price_snapshots",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_investment_price_snapshots_user_id"),
        "investment_price_snapshots",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_investment_price_snapshots_user_id"), table_name="investment_price_snapshots")
    op.drop_index(op.f("ix_investment_price_snapshots_id"), table_name="investment_price_snapshots")
    op.drop_index(op.f("ix_investment_price_snapshots_asset_id"), table_name="investment_price_snapshots")
    op.drop_table("investment_price_snapshots")

    op.drop_column("investment_assets", "price_updated_at")
    op.drop_column("investment_assets", "price_source")
