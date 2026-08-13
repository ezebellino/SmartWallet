"""add notifications

Revision ID: 20260811_0012
Revises: 20260811_0011
Create Date: 2026-08-11 11:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260811_0012"
down_revision: str | None = "20260811_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "budget_near_limit",
                "budget_exceeded",
                "ai_report_pending",
                "goal_without_contribution",
                name="notificationtype",
            ),
            nullable=False,
        ),
        sa.Column(
            "priority",
            sa.Enum("low", "medium", "high", name="notificationpriority"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("action_label", sa.String(length=80), nullable=True),
        sa.Column("action_section", sa.String(length=40), nullable=True),
        sa.Column("dedupe_key", sa.String(length=180), nullable=False),
        sa.Column("period_year", sa.Integer(), nullable=True),
        sa.Column("period_month", sa.Integer(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "dedupe_key", name="uq_notification_user_dedupe_key"),
    )
    op.create_index(op.f("ix_notifications_id"), "notifications", ["id"], unique=False)
    op.create_index(op.f("ix_notifications_is_read"), "notifications", ["is_read"], unique=False)
    op.create_index(op.f("ix_notifications_period_month"), "notifications", ["period_month"], unique=False)
    op.create_index(op.f("ix_notifications_period_year"), "notifications", ["period_year"], unique=False)
    op.create_index(op.f("ix_notifications_priority"), "notifications", ["priority"], unique=False)
    op.create_index(op.f("ix_notifications_type"), "notifications", ["type"], unique=False)
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_type"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_priority"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_period_year"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_period_month"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_is_read"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    op.drop_table("notifications")
    sa.Enum(name="notificationpriority").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="notificationtype").drop(op.get_bind(), checkfirst=True)
