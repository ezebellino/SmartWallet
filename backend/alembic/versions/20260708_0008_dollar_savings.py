"""Add dollar savings

Revision ID: 20260708_0008
Revises: 20260703_0007
Create Date: 2026-07-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260708_0008"
down_revision: str | None = "20260703_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "dollar_savings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "source",
            sa.Enum("manual", "bank", "mercado_pago", "cash", "other", name="dollarsavingsource"),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("saved_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_dollar_savings_id"), "dollar_savings", ["id"], unique=False)
    op.create_index(op.f("ix_dollar_savings_user_id"), "dollar_savings", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_dollar_savings_user_id"), table_name="dollar_savings")
    op.drop_index(op.f("ix_dollar_savings_id"), table_name="dollar_savings")
    op.drop_table("dollar_savings")
