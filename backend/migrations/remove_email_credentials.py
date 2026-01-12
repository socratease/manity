#!/usr/bin/env python3
"""
One-time migration script to remove email credentials from the database.

This removes the username and password columns from the email_settings table,
enforcing anonymous-only email sending.

Usage:
    python -m backend.migrations.remove_email_credentials

Or directly:
    python backend/migrations/remove_email_credentials.py
"""

import os
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from sqlmodel import Session, create_engine


def get_database_url() -> str:
    """Get database URL from environment or use default SQLite path."""
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    # Default to SQLite in backend directory
    db_path = Path(__file__).parent.parent / "manity.db"
    return f"sqlite:///{db_path}"


def run_migration():
    """Remove username and password columns from email_settings table."""
    database_url = get_database_url()
    print(f"Connecting to database: {database_url}")

    engine = create_engine(database_url)

    with Session(engine) as session:
        # Check if we're using SQLite (requires different approach)
        is_sqlite = "sqlite" in database_url.lower()

        if is_sqlite:
            # SQLite doesn't support DROP COLUMN directly before version 3.35.0
            # We need to recreate the table
            print("Detected SQLite database - using table recreation approach")

            # Check if columns exist first
            result = session.exec(text("PRAGMA table_info(emailsettings)"))
            columns = [row[1] for row in result.fetchall()]

            if "username" not in columns and "password" not in columns:
                print("Columns 'username' and 'password' already removed. Nothing to do.")
                return

            print("Removing 'username' and 'password' columns from emailsettings table...")

            # SQLite table recreation approach
            session.exec(text("""
                CREATE TABLE IF NOT EXISTS emailsettings_new (
                    id INTEGER PRIMARY KEY,
                    smtp_server TEXT DEFAULT '',
                    smtp_port INTEGER DEFAULT 587,
                    use_tls INTEGER DEFAULT 1,
                    from_address TEXT
                )
            """))

            session.exec(text("""
                INSERT INTO emailsettings_new (id, smtp_server, smtp_port, use_tls, from_address)
                SELECT id, smtp_server, smtp_port, use_tls, from_address
                FROM emailsettings
            """))

            session.exec(text("DROP TABLE emailsettings"))
            session.exec(text("ALTER TABLE emailsettings_new RENAME TO emailsettings"))

        else:
            # PostgreSQL/MySQL - can use ALTER TABLE DROP COLUMN
            print("Removing 'username' and 'password' columns from emailsettings table...")

            try:
                session.exec(text("ALTER TABLE emailsettings DROP COLUMN IF EXISTS username"))
                session.exec(text("ALTER TABLE emailsettings DROP COLUMN IF EXISTS password"))
            except Exception as e:
                print(f"Note: {e}")
                print("Columns may already be removed.")

        session.commit()
        print("Migration completed successfully!")
        print("Email credentials have been permanently removed from the database.")


if __name__ == "__main__":
    run_migration()
