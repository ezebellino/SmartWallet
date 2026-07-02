"""Add AI reports

Revision ID: 20260701_0005
Revises: 20260701_0004
Create Date: 2026-07-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260701_0005"
down_revision: str | None = "20260701_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("period_year", sa.Integer(), nullable=False),
        sa.Column("period_month", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=False),
        sa.Column("prompt_version", sa.String(length=40), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("recommendations", sa.Text(), nullable=False),
        sa.Column("risk_warnings", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "period_year", "period_month", name="uq_ai_report_user_period"),
    )
    op.create_index(op.f("ix_ai_reports_id"), "ai_reports", ["id"], unique=False)
    op.create_index(op.f("ix_ai_reports_user_id"), "ai_reports", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_reports_user_id"), table_name="ai_reports")
    op.drop_index(op.f("ix_ai_reports_id"), table_name="ai_reports")
    op.drop_table("ai_reports")

