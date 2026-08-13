"""add job runs

Revision ID: 20260812_0015
Revises: 20260811_0014
Create Date: 2026-08-12 00:15:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260812_0015"
down_revision: str | None = "20260811_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "job_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_key", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("users_processed", sa.Integer(), nullable=False),
        sa.Column("success_count", sa.Integer(), nullable=False),
        sa.Column("failure_count", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_job_runs_id"), "job_runs", ["id"], unique=False)
    op.create_index(op.f("ix_job_runs_job_key"), "job_runs", ["job_key"], unique=False)
    op.create_index(op.f("ix_job_runs_status"), "job_runs", ["status"], unique=False)
    op.create_index(op.f("ix_job_runs_started_at"), "job_runs", ["started_at"], unique=False)
    op.create_index(op.f("ix_job_runs_finished_at"), "job_runs", ["finished_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_job_runs_finished_at"), table_name="job_runs")
    op.drop_index(op.f("ix_job_runs_started_at"), table_name="job_runs")
    op.drop_index(op.f("ix_job_runs_status"), table_name="job_runs")
    op.drop_index(op.f("ix_job_runs_job_key"), table_name="job_runs")
    op.drop_index(op.f("ix_job_runs_id"), table_name="job_runs")
    op.drop_table("job_runs")
