"""add checks table (cheque tracking as first-class entity)

Revision ID: 20260809_chk
Revises: 20260809_biz
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260809_chk"
down_revision: Union[str, None] = "20260809_biz"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


check_direction = sa.Enum("issued", "received", name="checkdirection")
check_status = sa.Enum("pending", "cleared", "bounced", "voided", name="checkstatus")


def upgrade() -> None:
    op.create_table(
        "checks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("direction", check_direction, nullable=False),
        sa.Column("counterparty_name", sa.String(length=200), nullable=False),
        sa.Column("amount", sa.Numeric(14, 0), nullable=False),
        sa.Column("bank_name", sa.String(length=100), nullable=True),
        sa.Column("check_number", sa.String(length=50), nullable=True),
        sa.Column("sayad_id", sa.String(length=16), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("status", check_status, nullable=False, server_default="pending"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_checks_id"), "checks", ["id"], unique=False)
    op.create_index(op.f("ix_checks_user_id"), "checks", ["user_id"], unique=False)
    op.create_index(op.f("ix_checks_account_id"), "checks", ["account_id"], unique=False)
    op.create_index(op.f("ix_checks_sayad_id"), "checks", ["sayad_id"], unique=False)
    op.create_index(op.f("ix_checks_due_date"), "checks", ["due_date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_checks_due_date"), table_name="checks")
    op.drop_index(op.f("ix_checks_sayad_id"), table_name="checks")
    op.drop_index(op.f("ix_checks_account_id"), table_name="checks")
    op.drop_index(op.f("ix_checks_user_id"), table_name="checks")
    op.drop_index(op.f("ix_checks_id"), table_name="checks")
    op.drop_table("checks")
    check_status.drop(op.get_bind(), checkfirst=True)
    check_direction.drop(op.get_bind(), checkfirst=True)
