import os
import logging
from pathlib import Path
from sqlalchemy import event, create_engine
from sqlalchemy.engine.url import make_url
from sqlmodel import Session, SQLModel

logger = logging.getLogger(__name__)

DEFAULT_DEV_DB_PATH = "/home/c17420g/projects/manity-dev-data/portfolio.db"
DEFAULT_PROD_DB_PATH = "/home/c17420g/projects/manity-data/portfolio.db"
DEFAULT_DB_PATH = DEFAULT_DEV_DB_PATH
PERSISTENT_SQLITE_ROOTS = [
    Path("/var/data"),
    Path(DEFAULT_DEV_DB_PATH).parent,
    Path(DEFAULT_PROD_DB_PATH).parent,
]

def validate_sqlite_database_path(db_path: str | None) -> Path:
    if not db_path or db_path == ":memory:":
        logger.error(
            "DATABASE_URL cannot point to an in-memory SQLite database; configure a persistent path"
        )
        raise ValueError("DATABASE_URL must reference a persistent SQLite file")

    resolved_path = Path(db_path).expanduser()
    if not resolved_path.is_absolute():
        logger.error(
            "DATABASE_URL must use an absolute path for persistence (got %s)", resolved_path
        )
        raise ValueError("DATABASE_URL must be an absolute path for SQLite")

    if not any(resolved_path.is_relative_to(root) for root in PERSISTENT_SQLITE_ROOTS):
        logger.warning(
            "SQLite database path %s is outside known persistent mounts; data may not survive restarts",
            resolved_path,
        )

    resolved_path.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Using SQLite database at %s", resolved_path)
    return resolved_path

def configure_sqlite_engine(engine):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA busy_timeout=30000;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

def create_engine_from_env(database_url: str | None = None):
    resolved_url = database_url or os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    url = make_url(resolved_url)

    if url.get_backend_name() == "sqlite":
        connect_args = {"check_same_thread": False, "timeout": 30}
        resolved_path = validate_sqlite_database_path(url.database)
        url = url.set(database=str(resolved_path))
    else:
        connect_args = {}
        logger.info(
            "Using database URL %s", url.render_as_string(hide_password=False)
        )

    engine = create_engine(url, connect_args=connect_args, pool_pre_ping=True)

    if url.get_backend_name() == "sqlite":
        configure_sqlite_engine(engine)

    return engine

engine = create_engine_from_env()
_PRAGMA_CACHE: dict[str, set[str]] = {}

def table_has_column(table_name: str, column_name: str) -> bool:
    cache_key = f"{table_name}:{column_name}"
    if cache_key in _PRAGMA_CACHE:
        return True

    with engine.connect() as connection:
        result = connection.exec_driver_sql(f"PRAGMA table_info({table_name})").all()
        for _, name, *_ in result:
            if name == column_name:
                _PRAGMA_CACHE[cache_key] = {column_name}
                return True
    return False

def ensure_column(table_name: str, column_definition: str) -> None:
    column_name = column_definition.split()[0].strip('"')
    if table_has_column(table_name, column_name):
        return

    with engine.begin() as connection:
        connection.exec_driver_sql(f'ALTER TABLE "{table_name}" ADD COLUMN {column_definition}')
    _PRAGMA_CACHE[f"{table_name}:{column_name}"] = {column_name}

def create_db_and_tables() -> None:
    # Need to make sure models are imported before calling this
    # but we can't import them here to avoid circularity if models import database
    # Assuming models are imported by the caller (main.py)
    SQLModel.metadata.create_all(engine)
    ensure_column("task", 'assignee_id TEXT REFERENCES person(id) ON DELETE SET NULL')
    ensure_column("subtask", 'assignee_id TEXT REFERENCES person(id) ON DELETE SET NULL')
    ensure_column("activity", 'author_id TEXT REFERENCES person(id) ON DELETE SET NULL')
    ensure_column("activity", "task_context TEXT")
    ensure_column("project", "stakeholders JSON")
    ensure_column("project", "executiveUpdate TEXT")
    ensure_column("project", "startDate TEXT")
    ensure_column("project", "targetDate TEXT")
    ensure_column("project", "lastUpdate TEXT")
    ensure_column("project", "priority TEXT")
    ensure_column("project", "progress INTEGER")
    ensure_column("project", "status TEXT")
    ensure_column("project", "description TEXT")

def get_session():
    with Session(engine) as session:
        yield session
