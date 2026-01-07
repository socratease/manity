"""
Person Service

Consolidates all person resolution logic for the Manity backend.
This is the single source of truth for person lookups, creation, and upserts.
"""

from typing import Any, Optional, Union
from sqlmodel import Session, select

# Import models (using string import to avoid circular deps)
from backend.main import Person, PersonPayload


def normalize_person_identity(
    name: Optional[str],
    email: Optional[str],
) -> tuple[Optional[str], Optional[str]]:
    """Normalize name and email for consistent lookups."""
    normalized_name = name.strip() if name else None
    normalized_email = email.strip().lower() if email else None

    if normalized_name == "":
        normalized_name = None
    if normalized_email == "":
        normalized_email = None

    return normalized_name, normalized_email


class PersonService:
    """
    Service for person resolution and management.

    This class consolidates all person-related logic including:
    - Finding persons by name, email, or ID
    - Creating new persons
    - Upserting persons (create or update)
    - Resolving person references from various formats
    """

    def __init__(self, session: Session):
        self.session = session

    def get_by_id(self, person_id: str) -> Optional[Person]:
        """Get a person by their ID."""
        if not person_id:
            return None
        return self.session.exec(
            select(Person).where(Person.id == person_id)
        ).first()

    def get_by_name(self, name: str) -> Optional[Person]:
        """Get a person by their name (case-insensitive)."""
        if not name:
            return None

        normalized_name = name.strip()
        if not normalized_name:
            return None

        statement = select(Person).where(
            Person.name.ilike(normalized_name)
        )
        return self.session.exec(statement).first()

    def get_by_email(self, email: str) -> Optional[Person]:
        """Get a person by their email (case-insensitive)."""
        if not email:
            return None

        normalized_email = email.strip().lower()
        if not normalized_email:
            return None

        statement = select(Person).where(
            Person.email.ilike(normalized_email)
        )
        return self.session.exec(statement).first()

    def resolve_existing(
        self,
        person_id: Optional[str] = None,
        name: Optional[str] = None,
        email: Optional[str] = None,
    ) -> Optional[Person]:
        """
        Resolve an existing person by ID, email, or name (in that priority order).

        Returns None if no matching person is found.
        """
        normalized_name, normalized_email = normalize_person_identity(name, email)

        # Priority 1: ID
        if person_id:
            person = self.get_by_id(person_id)
            if person:
                return person

        # Priority 2: Email
        if normalized_email:
            person = self.get_by_email(normalized_email)
            if person:
                return person

        # Priority 3: Name
        if normalized_name:
            return self.get_by_name(normalized_name)

        return None

    def create(
        self,
        name: str,
        team: str = "Contributor",
        email: Optional[str] = None,
    ) -> Person:
        """Create a new person."""
        import uuid

        normalized_name, normalized_email = normalize_person_identity(name, email)

        if not normalized_name:
            raise ValueError("Person name is required")

        person = Person(
            id=str(uuid.uuid4()),
            name=normalized_name,
            team=team or "Contributor",
            email=normalized_email,
        )

        self.session.add(person)
        self.session.commit()
        self.session.refresh(person)

        return person

    def upsert(self, payload: PersonPayload) -> Person:
        """
        Create or update a person from a payload.

        If a person with the same name or email exists, update their info.
        Otherwise, create a new person.
        """
        import uuid

        normalized_name, normalized_email = normalize_person_identity(
            payload.name, payload.email
        )

        existing = self.resolve_existing(
            person_id=getattr(payload, 'id', None),
            name=normalized_name,
            email=normalized_email,
        )

        if existing:
            # Update existing person
            existing.team = payload.team or existing.team
            existing.email = normalized_email or existing.email

            # Update name if different and no conflict
            if normalized_name and existing.name.lower() != normalized_name.lower():
                conflict = self.get_by_name(normalized_name)
                if conflict is None or conflict.id == existing.id:
                    existing.name = normalized_name

            self.session.add(existing)
            self.session.commit()
            self.session.refresh(existing)
            return existing

        # Create new person
        return self.create(
            name=normalized_name or payload.name,
            team=payload.team or "Contributor",
            email=normalized_email,
        )

    def resolve_reference(
        self,
        reference: Union[str, dict, Any, None],
    ) -> Optional[Person]:
        """
        Resolve a person reference from various formats.

        Accepts:
        - String: treated as name, creates if not found
        - Dict/Object with id, name, team, email fields
        - None: returns None

        Returns the resolved Person or None.
        """
        if reference is None:
            return None

        # Handle string reference (name)
        if isinstance(reference, str):
            normalized = reference.strip()
            if not normalized:
                return None

            existing = self.get_by_name(normalized)
            if existing:
                return existing

            # Create new person with default team
            return self.create(name=normalized, team="Contributor")

        # Handle dict/object reference
        person_id = None
        name = None
        team = None
        email = None

        if hasattr(reference, "id"):
            person_id = reference.id
        elif isinstance(reference, dict):
            person_id = reference.get("id")

        if hasattr(reference, "name"):
            name = reference.name
        elif isinstance(reference, dict):
            name = reference.get("name")

        if hasattr(reference, "team"):
            team = reference.team
        elif isinstance(reference, dict):
            team = reference.get("team")

        if hasattr(reference, "email"):
            email = reference.email
        elif isinstance(reference, dict):
            email = reference.get("email")

        normalized_name, normalized_email = normalize_person_identity(name, email)
        normalized_team = team.strip() if team else None

        # Try to resolve existing person
        existing = self.resolve_existing(
            person_id=person_id,
            name=normalized_name,
            email=normalized_email,
        )

        if existing:
            # Update with new info if provided
            updated = False
            if normalized_team and existing.team != normalized_team:
                existing.team = normalized_team
                updated = True
            if normalized_email and existing.email != normalized_email:
                existing.email = normalized_email
                updated = True
            if normalized_name and existing.name.lower() != normalized_name.lower():
                conflict = self.get_by_name(normalized_name)
                if conflict is None or conflict.id == existing.id:
                    existing.name = normalized_name
                    updated = True

            if updated:
                self.session.add(existing)
                self.session.commit()
                self.session.refresh(existing)

            return existing

        # Create new person if we have enough info
        if not normalized_name:
            return None

        return self.create(
            name=normalized_name,
            team=normalized_team or "Contributor",
            email=normalized_email,
        )

    @staticmethod
    def serialize(person: Optional[Person]) -> Optional[dict]:
        """Serialize a person to a dictionary."""
        if person is None:
            return None
        return {
            "id": person.id,
            "name": person.name,
            "team": person.team,
            "email": person.email,
        }


# Convenience functions for backward compatibility
def get_person_service(session: Session) -> PersonService:
    """Get a PersonService instance for the given session."""
    return PersonService(session)
