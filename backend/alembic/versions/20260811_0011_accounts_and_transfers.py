"""Add financial accounts and transfers

Revision ID: 20260811_0011
Revises: 20260811_0010
Create Date: 2026-08-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260811_0011"
down_revision: str | None = "20260811_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    account_type = postgresql.ENUM("bank", "wallet", "cash", "investment", "other", name="accounttype", create_type=False)
    account_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "financial_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("type", account_type, nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("institution", sa.String(length=120), nullable=True),
        sa.Column("color", sa.String(length=20), nullable=False),
        sa.Column("icon", sa.String(length=40), nullable=False),
        sa.Column("initial_balance", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name", name="uq_financial_account_user_name"),
    )
    op.create_index(op.f("ix_financial_accounts_id"), "financial_accounts", ["id"], unique=False)
    op.create_index(op.f("ix_financial_accounts_user_id"), "financial_accounts", ["user_id"], unique=False)

    op.add_column("transactions", sa.Column("account_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_transactions_account_id"), "transactions", ["account_id"], unique=False)
    op.create_foreign_key(
        "fk_transactions_account_id_financial_accounts",
        "transactions",
        "financial_accounts",
        ["account_id"],
        ["id"],
    )

    op.create_table(
        "account_transfers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("from_account_id", sa.Integer(), nullable=False),
        sa.Column("to_account_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("transfer_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["from_account_id"], ["financial_accounts.id"]),
        sa.ForeignKeyConstraint(["to_account_id"], ["financial_accounts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_account_transfers_from_account_id"), "account_transfers", ["from_account_id"], unique=False)
    op.create_index(op.f("ix_account_transfers_id"), "account_transfers", ["id"], unique=False)
    op.create_index(op.f("ix_account_transfers_to_account_id"), "account_transfers", ["to_account_id"], unique=False)
    op.create_index(op.f("ix_account_transfers_user_id"), "account_transfers", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_account_transfers_user_id"), table_name="account_transfers")
    op.drop_index(op.f("ix_account_transfers_to_account_id"), table_name="account_transfers")
    op.drop_index(op.f("ix_account_transfers_id"), table_name="account_transfers")
    op.drop_index(op.f("ix_account_transfers_from_account_id"), table_name="account_transfers")
    op.drop_table("account_transfers")

    op.drop_constraint("fk_transactions_account_id_financial_accounts", "transactions", type_="foreignkey")
    op.drop_index(op.f("ix_transactions_account_id"), table_name="transactions")
    op.drop_column("transactions", "account_id")

    op.drop_index(op.f("ix_financial_accounts_user_id"), table_name="financial_accounts")
    op.drop_index(op.f("ix_financial_accounts_id"), table_name="financial_accounts")
    op.drop_table("financial_accounts")

    sa.Enum(name="accounttype").drop(op.get_bind(), checkfirst=True)
