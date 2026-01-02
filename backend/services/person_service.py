from typing import Optional, Sequence, List
from sqlmodel import Session, select, func
import uuid
from ..models.models import Person, Stakeholder, PersonReference
from ..schemas.schemas import PersonPayload, AssigneePayload

def generate_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"

def get_person_by_name(session: Session, name: str) -> Optional[Person]:
    if not name:
        return None

    normalized_name = name.strip()
    if not normalized_name:
        return None

    statement = select(Person).where(func.lower(Person.name) == normalized_name.lower())
    return session.exec(statement).first()

def get_person_by_email(session: Session, email: str | None) -> Optional[Person]:
    if not email:
        return None

    normalized_email = email.strip().lower()
    if not normalized_email:
        return None

    statement = select(Person).where(func.lower(Person.email) == normalized_email)
    return session.exec(statement).first()

class PersonIndex:
    def __init__(self, people: Sequence[Person]):
        self.by_id: dict[str, Person] = {}
        self.by_name: dict[str, Person] = {}
        self.by_email: dict[str, Person] = {}

        for person in people:
            if person.id:
                self.by_id[person.id] = person
            if person.name:
                self.by_name[person.name.lower()] = person
            if person.email:
                self.by_email[person.email.lower()] = person

    def resolve(self, *, name: str | None = None, email: str | None = None, person_id: str | None = None) -> Optional[Person]:
        if person_id and person_id in self.by_id:
            return self.by_id[person_id]

        if email and (email.lower() in self.by_email):
            return self.by_email[email.lower()]

        if name and (name.lower() in self.by_name):
            return self.by_name[name.lower()]

        return None

def build_person_index(session: Session) -> PersonIndex:
    return PersonIndex(session.exec(select(Person)).all())

def _normalize_person_identity(name: str, email: str | None = None) -> tuple[str, str | None]:
    normalized_name = name.strip()
    normalized_email = email.strip().lower() if email else None
    return normalized_name, normalized_email

def _resolve_existing_person(
    session: Session,
    *,
    normalized_name: str,
    normalized_email: str | None = None,
    person_id: str | None = None,
) -> Optional[Person]:
    if person_id:
        person = session.get(Person, person_id)
        if person:
            return person

    person = get_person_by_email(session, normalized_email)
    if person:
        return person

    return get_person_by_name(session, normalized_name)

def upsert_person_from_payload(session: Session, payload: PersonPayload) -> Person:
    normalized_name, normalized_email = _normalize_person_identity(payload.name, payload.email)

    existing = _resolve_existing_person(
        session,
        normalized_name=normalized_name,
        normalized_email=normalized_email,
        person_id=payload.id,
    )

    if existing:
        existing.team = payload.team or existing.team
        existing.email = normalized_email or existing.email
        if normalized_name and existing.name.lower() != normalized_name.lower():
            conflict = get_person_by_name(session, normalized_name)
            if conflict is None or conflict.id == existing.id:
                existing.name = normalized_name
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    person = Person(
        id=payload.id or generate_id("person"),
        name=normalized_name,
        team=payload.team,
        email=normalized_email,
    )
    session.add(person)
    session.commit()
    session.refresh(person)
    return person

def upsert_person_from_details(
    session: Session,
    name: str,
    team: str | None = None,
    email: str | None = None,
    person_id: str | None = None,
) -> Person:
    normalized_name, normalized_email = _normalize_person_identity(name, email)
    normalized_team = team.strip() if team else ""

    existing = _resolve_existing_person(
        session,
        normalized_name=normalized_name,
        normalized_email=normalized_email,
        person_id=person_id,
    )

    if existing:
        if normalized_team:
            existing.team = normalized_team
        if email is not None:
            existing.email = normalized_email
        if normalized_name and existing.name.lower() != normalized_name.lower():
            conflict = get_person_by_name(session, normalized_name)
            if conflict is None or conflict.id == existing.id:
                existing.name = normalized_name
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    person = Person(
        id=person_id or generate_id("person"),
        name=normalized_name,
        team=normalized_team,
        email=normalized_email,
    )
    session.add(person)
    session.commit()
    session.refresh(person)
    return person

def resolve_person_reference(session: Session, reference) -> Optional[Person]:
    """
    Accepts a variety of person representations (id dict, PersonPayload, Stakeholder, or name string)
    and returns a persisted Person instance, creating or updating as needed.
    """
    if reference is None:
        return None

    if isinstance(reference, Person):
        return reference

    if isinstance(reference, str):
        normalized = reference.strip()
        if not normalized:
            return None
        payload = PersonPayload(name=normalized, team="Contributor")
        return upsert_person_from_payload(session, payload)

    person_id = None
    name = None
    team = None
    email = None

    if isinstance(reference, Stakeholder):
        person_id = reference.id
        name = reference.name
        team = reference.team
    elif isinstance(reference, AssigneePayload):
        person_id = reference.id
        name = reference.name
        team = reference.team
    elif isinstance(reference, PersonPayload):
        person_id = reference.id
        name = reference.name
        team = reference.team
        email = reference.email
    elif isinstance(reference, PersonReference):
        person_id = reference.id
        name = reference.name
        team = reference.team
        email = reference.email
    elif isinstance(reference, dict):
        person_id = reference.get("id")
        name = reference.get("name")
        team = reference.get("team")
        email = reference.get("email")
    else:
        return None

    normalized_name = (name or "").strip()
    normalized_team = (team or "").strip() or "Contributor"

    if person_id:
        person = session.get(Person, person_id)
        if person:
            if normalized_name:
                person.name = normalized_name
            person.team = normalized_team or person.team
            if email is not None:
                person.email = email
            session.add(person)
            session.commit()
            session.refresh(person)
            return person

        if not normalized_name:
            return None

        person = Person(
            id=person_id,
            name=normalized_name,
            team=normalized_team,
            email=email,
        )
        session.add(person)
        session.commit()
        session.refresh(person)
        return person

    if not normalized_name:
        return None

    payload = PersonPayload(name=normalized_name, team=normalized_team, email=email)
    return upsert_person_from_payload(session, payload)

def normalize_stakeholders(stakeholders: Optional[List[Stakeholder | dict]]) -> list[dict]:
    normalized: list[dict] = []
    for stakeholder in stakeholders or []:
        if isinstance(stakeholder, Stakeholder):
            data = stakeholder.model_dump()
        elif isinstance(stakeholder, dict):
            data = {
                "id": stakeholder.get("id"),
                "name": stakeholder.get("name", ""),
                "team": stakeholder.get("team", ""),
                "email": stakeholder.get("email"),
            }
        else:
            raise TypeError("Unsupported stakeholder type")

        data["name"] = (data.get("name") or "").strip()
        data["team"] = data.get("team") or ""
        data["email"] = (data.get("email") or None)
        normalized.append(data)
    return normalized

def normalize_project_stakeholders(session: Session, stakeholders: Optional[List[Stakeholder | dict]]) -> list[dict]:
    normalized: list[dict] = []
    for stakeholder in normalize_stakeholders(stakeholders):
        if not stakeholder.get("name"):
            continue

        person = upsert_person_from_details(
            session,
            name=stakeholder.get("name", ""),
            team=stakeholder.get("team", ""),
            email=stakeholder.get("email"),
            person_id=stakeholder.get("id"),
        )

        normalized.append(
            {
                "id": person.id,
                "name": person.name,
                "team": stakeholder.get("team") or person.team or "",
                "email": person.email,
            }
        )

    return normalized
