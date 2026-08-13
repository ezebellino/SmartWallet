"""Add external transaction references

Revision ID: 20260811_0010
Revises: 20260729_0009
Create Date: 2026-08-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260811_0010"
down_revision: str | None = "20260729_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("external_source", sa.String(length=40), nullable=True))
    op.add_column("transactions", sa.Column("external_id", sa.String(length=160), nullable=True))
    op.create_unique_constraint(
        "uq_transaction_external_source_id",
        "transactions",
        ["user_id", "external_source", "external_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_transaction_external_source_id", "transactions", type_="unique")
    op.drop_column("transactions", "external_id")
    op.drop_column("transactions", "external_source")
