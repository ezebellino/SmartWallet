"""Add saving goals

Revision ID: 20260701_0002
Revises: 20260701_0001
Create Date: 2026-07-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260701_0002"
down_revision: str | None = "20260701_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "saving_goals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("target_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("current_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("active", "completed", "paused", "cancelled", name="savinggoalstatus"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_saving_goals_id"), "saving_goals", ["id"], unique=False)
    op.create_index(op.f("ix_saving_goals_user_id"), "saving_goals", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_saving_goals_user_id"), table_name="saving_goals")
    op.drop_index(op.f("ix_saving_goals_id"), table_name="saving_goals")
    op.drop_table("saving_goals")

