import logging

from sqlmodel import Session

from backend.main import create_db_and_tables, engine, is_dev_seeding_enabled, seed_default_projects

logger = logging.getLogger(__name__)


def main() -> int:
    """Seed demo projects for local development when explicitly enabled."""

    create_db_and_tables()

    if not is_dev_seeding_enabled():
        logger.error(
            "Demo seeding is disabled. Set MANITY_ENABLE_DEMO_SEED=1 and avoid production/test environments."
        )
        return 1

    with Session(engine) as session:
        seeded = seed_default_projects(session)
        if seeded:
            logger.info("Inserted demo projects into empty database")
        else:
            logger.info("Skipped demo seeding because data already exists")

    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
    raise SystemExit(main())
