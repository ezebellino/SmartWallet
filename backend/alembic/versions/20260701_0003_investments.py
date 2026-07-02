"""Add investments

Revision ID: 20260701_0003
Revises: 20260701_0002
Create Date: 2026-07-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260701_0003"
down_revision: str | None = "20260701_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "investment_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("symbol", sa.String(length=30), nullable=False),
        sa.Column(
            "asset_type",
            sa.Enum(
                "stock",
                "crypto",
                "bond",
                "cedear",
                "mutual_fund",
                "index",
                "etf",
                "fixed_term",
                "other",
                name="investmentassettype",
            ),
            nullable=False,
        ),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column(
            "risk_level",
            sa.Enum("low", "medium", "high", name="investmentrisklevel"),
            nullable=False,
        ),
        sa.Column("current_price", sa.Numeric(precision=14, scale=4), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_investment_assets_id"), "investment_assets", ["id"], unique=False)
    op.create_index(
        op.f("ix_investment_assets_user_id"),
        "investment_assets",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "investment_operations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column(
            "operation_type",
            sa.Enum("buy", "sell", name="investmentoperationtype"),
            nullable=False,
        ),
        sa.Column("quantity", sa.Numeric(precision=18, scale=8), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=14, scale=4), nullable=False),
        sa.Column("fees", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("operation_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["asset_id"], ["investment_assets.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_investment_operations_asset_id"),
        "investment_operations",
        ["asset_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_investment_operations_id"),
        "investment_operations",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_investment_operations_user_id"),
        "investment_operations",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_investment_operations_user_id"), table_name="investment_operations")
    op.drop_index(op.f("ix_investment_operations_id"), table_name="investment_operations")
    op.drop_index(op.f("ix_investment_operations_asset_id"), table_name="investment_operations")
    op.drop_table("investment_operations")

    op.drop_index(op.f("ix_investment_assets_user_id"), table_name="investment_assets")
    op.drop_index(op.f("ix_investment_assets_id"), table_name="investment_assets")
    op.drop_table("investment_assets")

