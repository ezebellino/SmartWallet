"""add worker heartbeats

Revision ID: 20260818_0016
Revises: 20260812_0015
Create Date: 2026-08-18 00:16:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260818_0016"
down_revision: str | None = "20260812_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "worker_heartbeats",
        sa.Column("job_key", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("job_key"),
    )
    op.create_index(op.f("ix_worker_heartbeats_status"), "worker_heartbeats", ["status"], unique=False)
    op.create_index(op.f("ix_worker_heartbeats_last_seen_at"), "worker_heartbeats", ["last_seen_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_worker_heartbeats_last_seen_at"), table_name="worker_heartbeats")
    op.drop_index(op.f("ix_worker_heartbeats_status"), table_name="worker_heartbeats")
    op.drop_table("worker_heartbeats")
