import importlib.util
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations


def test_settlement_migration_preserves_legacy_rows_and_enforces_links():
    path = Path(__file__).parents[1] / "alembic" / "versions" / "20261030_add_settlement_links.py"
    spec = importlib.util.spec_from_file_location("settlement_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = sa.create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.exec_driver_sql("PRAGMA foreign_keys=ON")
        metadata = sa.MetaData()
        sa.Table("transactions", metadata, sa.Column("id", sa.Integer, primary_key=True))
        for name in ("invoices", "checks"):
            sa.Table(name, metadata, sa.Column("id", sa.Integer, primary_key=True), sa.Column("amount", sa.Integer), sa.Column("status", sa.String))
        metadata.create_all(connection)
        connection.exec_driver_sql("INSERT INTO transactions (id) VALUES (1)")
        connection.exec_driver_sql("INSERT INTO invoices (id, amount, status) VALUES (1, 200, 'paid'), (2, 300, 'issued')")
        connection.exec_driver_sql("INSERT INTO checks (id, amount, status) VALUES (1, 400, 'cleared')")
        migration.op = Operations(MigrationContext.configure(connection))
        migration.upgrade()
        assert connection.exec_driver_sql("SELECT amount, status, settlement_transaction_id FROM invoices WHERE id=1").one() == (200, "paid", None)
        assert connection.exec_driver_sql("SELECT amount, status, settlement_transaction_id FROM checks WHERE id=1").one() == (400, "cleared", None)
        connection.exec_driver_sql("UPDATE invoices SET settlement_transaction_id=1 WHERE id=1")
        with pytest.raises(sa.exc.IntegrityError), connection.begin_nested():
            connection.exec_driver_sql("UPDATE invoices SET settlement_transaction_id=1 WHERE id=2")
        with pytest.raises(sa.exc.IntegrityError), connection.begin_nested():
            connection.exec_driver_sql("DELETE FROM transactions WHERE id=1")
        migration.downgrade()
        assert "settlement_transaction_id" not in {column["name"] for column in sa.inspect(connection).get_columns("invoices")}
        assert connection.exec_driver_sql("SELECT amount, status FROM invoices WHERE id=1").one() == (200, "paid")
        assert connection.exec_driver_sql("SELECT count(*) FROM transactions").scalar() == 1
    engine.dispose()


def test_settlement_migration_renders_postgresql_constraints():
    from io import StringIO
    path = Path(__file__).parents[1] / "alembic" / "versions" / "20261030_add_settlement_links.py"
    spec = importlib.util.spec_from_file_location("settlement_migration_pg", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    output = StringIO()
    migration.op = Operations(MigrationContext.configure(dialect_name="postgresql", opts={"as_sql": True, "output_buffer": output}))
    migration.upgrade()
    sql = output.getvalue()
    assert "ALTER TABLE invoices ADD COLUMN settlement_transaction_id INTEGER" in sql
    assert "ALTER TABLE checks ADD COLUMN settlement_transaction_id INTEGER" in sql
    assert sql.count("REFERENCES transactions (id) ON DELETE RESTRICT") == 2
    assert sql.count("UNIQUE (settlement_transaction_id)") == 2
