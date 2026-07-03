"""Add market integration settings

Revision ID: 20260703_0007
Revises: 20260703_0006
Create Date: 2026-07-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260703_0007"
down_revision: str | None = "20260703_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "market_integration_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider_key", sa.String(length=40), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("api_key_encrypted", sa.String(length=2048), nullable=True),
        sa.Column("api_key_last4", sa.String(length=4), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "provider_key", name="uq_market_integration_user_provider"),
    )
    op.create_index(
        op.f("ix_market_integration_settings_id"),
        "market_integration_settings",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_market_integration_settings_user_id"),
        "market_integration_settings",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_market_integration_settings_user_id"), table_name="market_integration_settings")
    op.drop_index(op.f("ix_market_integration_settings_id"), table_name="market_integration_settings")
    op.drop_table("market_integration_settings")
