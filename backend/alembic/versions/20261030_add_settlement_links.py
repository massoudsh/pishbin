"""Link settled invoices and checks to their ledger transactions."""
from alembic import op
import sqlalchemy as sa

revision = "20261030_settlement"
down_revision = "20260812_cust"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("invoices", "checks"):
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column("settlement_transaction_id", sa.Integer(), nullable=True))
            batch.create_foreign_key(f"fk_{table}_settlement", "transactions", ["settlement_transaction_id"], ["id"], ondelete="RESTRICT")
            batch.create_unique_constraint(f"uq_{table}_settlement", ["settlement_transaction_id"])


def downgrade() -> None:
    for table in ("checks", "invoices"):
        with op.batch_alter_table(table) as batch:
            batch.drop_constraint(f"uq_{table}_settlement", type_="unique")
            batch.drop_constraint(f"fk_{table}_settlement", type_="foreignkey")
            batch.drop_column("settlement_transaction_id")
