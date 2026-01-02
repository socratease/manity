import os
import logging
from datetime import datetime
from typing import Optional
from fastapi import Request
from sqlmodel import Session

from .models.models import AuditLog, Activity
from .services.person_service import resolve_person_reference, generate_id

logger = logging.getLogger(__name__)

ENVIRONMENT_ENV = "MANITY_ENV"
PROTECTED_ENVIRONMENTS = {"prod", "production", "test", "testing"}
DEV_DEMO_SEED_ENV = "MANITY_ENABLE_DEMO_SEED"

def _normalize_env_value(value: str | None) -> str:
    return (value or "").strip().lower()

def current_environment() -> str:
    return _normalize_env_value(os.getenv(ENVIRONMENT_ENV, os.getenv("ENVIRONMENT")))

def is_dev_seeding_enabled() -> bool:
    environment = current_environment()
    if environment in PROTECTED_ENVIRONMENTS:
        logger.info("Skipping demo seeding because environment is set to %s", environment)
        return False

    flag_value = _normalize_env_value(os.getenv(DEV_DEMO_SEED_ENV))
    enabled = flag_value in {"1", "true", "yes", "on"}
    if not enabled:
        logger.info(
            "Demo project seeding disabled; set %s=1 to seed defaults in local development",
            DEV_DEMO_SEED_ENV,
        )
    return enabled

def log_action(
    session: Session,
    action: str,
    entity_type: str = None,
    entity_id: str = None,
    details: dict = None,
    request: Request = None
):
    import json
    log_entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=json.dumps(details) if details else None,
        user_agent=request.headers.get("user-agent") if request else None,
        ip_address=request.client.host if request and request.client else None
    )
    session.add(log_entry)
    session.commit()
    logger.info(f"Action logged: {action} on {entity_type}:{entity_id}")

def get_logged_in_user(request: Request | None) -> str | None:
    if not request:
        return None
    for header_name in ("x-logged-in-user", "x-user-name", "x-user"):
        header_value = request.headers.get(header_name)
        if header_value and header_value.strip():
            return header_value.strip()
    return None

def resolve_activity_author(
    session: Session,
    request: Request | None,
    fallback: str | None = None
) -> tuple[str, str | None]:
    name = get_logged_in_user(request) or fallback
    if name:
        author_person = resolve_person_reference(session, name)
        return author_person.name if author_person else name, author_person.id if author_person else None
    return "Unknown", None

def add_data_change_activity(
    session: Session,
    project_id: str,
    request: Request | None,
    note: str,
    author: str | None = None
) -> Activity:
    author_name, author_id = resolve_activity_author(session, request, author)
    activity = Activity(
        id=generate_id("activity"),
        date=datetime.utcnow().isoformat(),
        note=note,
        author=author_name,
        author_id=author_id,
        project_id=project_id,
    )
    session.add(activity)
    session.commit()
    return activity
