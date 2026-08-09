"""add businesses table and account.business_id (multi-business workspace)

Revision ID: 20260809_biz
Revises: 20260219_dash
Create Date: 2026-08-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260809_biz"
down_revision: Union[str, None] = "20260219_dash"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "businesses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_businesses_id"), "businesses", ["id"], unique=False)
    op.create_index(op.f("ix_businesses_owner_id"), "businesses", ["owner_id"], unique=False)

    # Add nullable first so we can backfill existing rows.
    op.add_column("accounts", sa.Column("business_id", sa.Integer(), nullable=True))

    connection = op.get_bind()
    businesses = sa.table(
        "businesses",
        sa.column("id", sa.Integer()),
        sa.column("owner_id", sa.Integer()),
        sa.column("name", sa.String()),
        sa.column("is_default", sa.Boolean()),
    )
    users = sa.table("users", sa.column("id", sa.Integer()), sa.column("full_name", sa.String()), sa.column("username", sa.String()))
    accounts = sa.table("accounts", sa.column("id", sa.Integer()), sa.column("user_id", sa.Integer()), sa.column("business_id", sa.Integer()))

    # One default business per existing user, then point their accounts at it.
    user_rows = connection.execute(sa.select(users.c.id, users.c.full_name, users.c.username)).fetchall()
    for user_id, full_name, username in user_rows:
        result = connection.execute(
            businesses.insert().values(
                owner_id=user_id,
                name=full_name or username,
                is_default=True,
            )
        )
        business_id = result.inserted_primary_key[0]
        connection.execute(
            accounts.update().where(accounts.c.user_id == user_id).values(business_id=business_id)
        )

    op.alter_column("accounts", "business_id", nullable=False)
    op.create_index(op.f("ix_accounts_business_id"), "accounts", ["business_id"], unique=False)
    op.create_foreign_key(
        "fk_accounts_business_id_businesses",
        "accounts", "businesses",
        ["business_id"], ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_accounts_business_id_businesses", "accounts", type_="foreignkey")
    op.drop_index(op.f("ix_accounts_business_id"), table_name="accounts")
    op.drop_column("accounts", "business_id")
    op.drop_index(op.f("ix_businesses_owner_id"), table_name="businesses")
    op.drop_index(op.f("ix_businesses_id"), table_name="businesses")
    op.drop_table("businesses")
