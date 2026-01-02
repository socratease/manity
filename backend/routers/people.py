from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from backend.main import (
    Person,
    PersonPayload,
    get_person_by_name,
    get_session,
    log_action,
    serialize_person,
    upsert_person_from_payload,
)

router = APIRouter(prefix="/people", tags=["people"])


@router.get("")
def list_people(session: Session = Depends(get_session)):
    statement = select(Person)
    people = session.exec(statement).all()

    unique_people: dict[str, Person] = {}
    seen_people: set[str] = set()
    for person in people:
        email_key = person.email.lower() if person.email else None
        name_key = person.name.lower() if person.name else None

        existing = None
        if email_key and email_key in unique_people:
            existing = unique_people[email_key]
        elif name_key and name_key in unique_people:
            existing = unique_people[name_key]

        if existing is None:
            if name_key:
                unique_people[name_key] = person
            if email_key:
                unique_people[email_key] = person
            continue

        # Collapse legacy duplicates by preferring the first encountered record
        existing.team = existing.team or person.team
        existing.email = existing.email or person.email
        session.delete(person)

    # Ensure each person appears only once even though we index by multiple keys
    deduped_people: list[Person] = []
    for person in unique_people.values():
        if person.id in seen_people:
            continue
        seen_people.add(person.id)
        deduped_people.append(person)

    session.commit()
    return [serialize_person(person) for person in deduped_people]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_person(payload: PersonPayload, request: Request, session: Session = Depends(get_session)):
    person = upsert_person_from_payload(session, payload)
    log_action(session, "create_person", "person", person.id, {"name": person.name, "team": person.team}, request)
    return serialize_person(person)


@router.get("/{person_id}")
def get_person(person_id: str, session: Session = Depends(get_session)):
    person = session.exec(select(Person).where(Person.id == person_id)).first()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    return serialize_person(person)


@router.put("/{person_id}")
def update_person(person_id: str, payload: PersonPayload, request: Request, session: Session = Depends(get_session)):
    person = session.exec(select(Person).where(Person.id == person_id)).first()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")

    normalized_name = payload.name.strip()

    conflict = get_person_by_name(session, normalized_name)
    if conflict and conflict.id != person.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A person with that name already exists",
        )

    old_values = {"name": person.name, "team": person.team, "email": person.email}
    person.name = normalized_name
    person.team = payload.team
    person.email = payload.email
    session.add(person)
    session.commit()
    session.refresh(person)
    log_action(session, "update_person", "person", person_id, {"old": old_values, "new": {"name": person.name, "team": person.team, "email": person.email}}, request)
    return serialize_person(person)


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: str, request: Request, session: Session = Depends(get_session)):
    person = session.exec(select(Person).where(Person.id == person_id)).first()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    deleted_data = {"name": person.name, "team": person.team}
    session.delete(person)
    session.commit()
    log_action(session, "delete_person", "person", person_id, deleted_data, request)
    return None
