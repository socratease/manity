import argparse
import os
import sys

from sqlmodel import Session, create_engine, select

if __package__ in (None, ""):
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    PARENT_DIR = os.path.dirname(CURRENT_DIR)
    if PARENT_DIR not in sys.path:
        sys.path.append(PARENT_DIR)

from backend.database import create_engine_from_env
from backend.models.models import MigrationState, Person, Project
from backend.services.person_service import normalize_project_stakeholders, upsert_person_from_details

def run_people_backfill_migration(session: Session) -> None:
    migration_key = "people-backfill-v1"
    if session.get(MigrationState, migration_key):
        print("Migration already applied.")
        return

    print("Starting people backfill migration...")
    projects = session.exec(select(Project)).all()
    updated_count = 0

    for project in projects:
        updated = False

        # Migrate stakeholders
        legacy_stakeholders = [
            stakeholder for stakeholder in project.stakeholders_legacy or []
            if not isinstance(stakeholder, Person)
        ]

        if legacy_stakeholders:
            normalized_stakeholders = normalize_project_stakeholders(session, legacy_stakeholders)
            if normalized_stakeholders:
                existing_person_ids = {person.id for person in project.stakeholders if person.id}
                for stakeholder in normalized_stakeholders:
                    person_id = stakeholder.get("id")
                    if not person_id or person_id in existing_person_ids:
                        continue

                    person = session.get(Person, person_id)
                    if person is None:
                        continue

                    project.stakeholders.append(person)
                    existing_person_ids.add(person_id)
                    updated = True

            project.stakeholders_legacy = [] # Clear legacy field
            updated = True

        if updated:
            session.add(project)
            updated_count += 1

    session.add(MigrationState(key=migration_key))
    session.commit()
    print(f"Migration completed. Updated {updated_count} projects.")

if __name__ == "__main__":
    engine = create_engine_from_env()
    with Session(engine) as session:
        run_people_backfill_migration(session)
