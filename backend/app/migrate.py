"""Tiny, safe schema upgrade: adds columns that newer versions need to tables that already exist.

`Base.metadata.create_all` creates missing TABLES but never adds missing COLUMNS to an existing table.
This keeps an older database (for example the local lifora.db) working after an update, without Alembic.
It only ever ADDS nullable columns and never changes or deletes data.
"""
import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

log = logging.getLogger("lifora.migrate")

# (table, column, SQL type). Types are valid on both SQLite and PostgreSQL.
NEW_COLUMNS = [
    ("users", "pending_password_hash", "VARCHAR(255)"),
    ("request_responses", "donor_claimed_at", "TIMESTAMP"),
]


def ensure_columns(engine: Engine) -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    for table, column, sql_type in NEW_COLUMNS:
        if table not in existing_tables:
            continue  # create_all has just created it with every column
        have = {c["name"] for c in inspector.get_columns(table)}
        if column in have:
            continue
        log.warning("Adding missing column %s.%s", table, column)
        with engine.begin() as conn:
            conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {sql_type}'))
