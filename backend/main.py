import logging
import os
import uuid
from datetime import datetime
from enum import Enum
from email.message import EmailMessage
import smtplib
from pathlib import Path
from typing import List, Optional, Sequence

from fastapi import Body, Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field as PydanticField
import httpx
from sqlalchemy import Column, String, delete, event, func
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import selectinload
from sqlmodel import Field, Relationship, SQLModel, Session, create_engine, select

logger = logging.getLogger(__name__)

# Configure database path with persistent storage
# Default to persistent directory outside of application folder
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
    """Enable WAL mode so readers don't block writers and vice versa."""

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):  # pragma: no cover - sqlite specific
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


def generate_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


class Stakeholder(BaseModel):
    name: str
    team: str


def normalize_stakeholders(stakeholders: Optional[List[Stakeholder | dict]]) -> list[dict]:
    normalized: list[dict] = []
    for stakeholder in stakeholders or []:
        if isinstance(stakeholder, Stakeholder):
            normalized.append(stakeholder.model_dump())
        elif isinstance(stakeholder, dict):
            normalized.append(
                {
                    "name": stakeholder.get("name", ""),
                    "team": stakeholder.get("team", ""),
                }
            )
        else:  # pragma: no cover - defensive
            raise TypeError("Unsupported stakeholder type")
    return normalized


def serialize_person(person: "Person") -> dict:
    return {
        "id": person.id,
        "name": person.name,
        "team": person.team,
        "email": person.email,
    }


def get_person_by_name(session: Session, name: str) -> "Person | None":
    if not name:
        return None

    normalized_name = name.strip()
    if not normalized_name:
        return None

    statement = select(Person).where(func.lower(Person.name) == normalized_name.lower())
    return session.exec(statement).first()


def upsert_person_from_payload(session: Session, payload: "PersonPayload") -> "Person":
    normalized_name = payload.name.strip()
    existing = get_person_by_name(session, normalized_name)

    if existing:
        existing.team = payload.team or existing.team
        existing.email = payload.email
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    person = Person(
        id=payload.id or generate_id("person"),
        name=normalized_name,
        team=payload.team,
        email=payload.email,
    )
    session.add(person)
    session.commit()
    session.refresh(person)
    return person


class SubtaskBase(SQLModel):
    title: str
    status: str = "todo"
    dueDate: Optional[str] = None
    completedDate: Optional[str] = None


class Subtask(SubtaskBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    task_id: Optional[str] = Field(default=None, foreign_key="task.id")
    task: "Task" = Relationship(back_populates="subtasks")


class TaskBase(SQLModel):
    title: str
    status: str = "todo"
    dueDate: Optional[str] = None
    completedDate: Optional[str] = None


class Task(TaskBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")
    project: "Project" = Relationship(back_populates="plan")
    subtasks: list[Subtask] = Relationship(
        back_populates="task",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class ActivityBase(SQLModel):
    date: str
    note: str
    author: str


class Activity(ActivityBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")
    project: "Project" = Relationship(back_populates="recentActivity")


class ProjectBase(SQLModel):
    name: str
    status: str = "planning"
    priority: str = "medium"
    progress: int = 0
    lastUpdate: Optional[str] = None
    description: str = ""
    executiveUpdate: Optional[str] = None
    startDate: Optional[str] = None
    targetDate: Optional[str] = None
    stakeholders: List[Stakeholder] = Field(default_factory=list, sa_column=Column(JSON))


class Project(ProjectBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    plan: list[Task] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    recentActivity: list[Activity] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class PersonBase(SQLModel):
    name: str = Field(sa_column=Column(String, unique=True, index=True))
    team: str
    email: Optional[str] = None


class Person(PersonBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)


class EmailSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=1, primary_key=True)
    smtp_server: str = ""
    smtp_port: int = 587
    username: Optional[str] = None
    password: Optional[str] = None
    use_tls: bool = True
    from_address: Optional[str] = None


class AuditLog(SQLModel, table=True):
    """Audit log for tracking all actions and AI conversations"""
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    action: str  # e.g., "create_project", "update_task", "llm_chat"
    entity_type: Optional[str] = None  # e.g., "project", "task", "person"
    entity_id: Optional[str] = None  # ID of the affected entity
    details: Optional[str] = Field(default=None, sa_column=Column(String))  # JSON string with additional details
    user_agent: Optional[str] = None  # Client user agent
    ip_address: Optional[str] = None  # Client IP address


def log_action(
    session: Session,
    action: str,
    entity_type: str = None,
    entity_id: str = None,
    details: dict = None,
    request: Request = None
):
    """Log an action to the audit log"""
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


class SubtaskPayload(SubtaskBase):
    id: Optional[str] = None


class TaskPayload(TaskBase):
    id: Optional[str] = None
    subtasks: List[SubtaskPayload] = Field(default_factory=list)


class ActivityPayload(ActivityBase):
    id: Optional[str] = None


class PersonPayload(PersonBase):
    id: Optional[str] = None


class ProjectPayload(ProjectBase):
    id: Optional[str] = None
    plan: List[TaskPayload] = Field(default_factory=list)
    recentActivity: List[ActivityPayload] = Field(default_factory=list)


class ImportPayload(BaseModel):
    projects: List[ProjectPayload]
    people: List[PersonPayload] = Field(default_factory=list)
    mode: str = "replace"


class EmailSettingsPayload(BaseModel):
    smtpServer: str
    smtpPort: int = 587
    username: Optional[str] = None
    password: Optional[str] = None
    useTLS: bool = True
    fromAddress: Optional[str] = None


class EmailSettingsResponse(BaseModel):
    smtpServer: str
    smtpPort: int
    username: Optional[str] = None
    fromAddress: Optional[str] = None
    useTLS: bool = True
    hasPassword: bool = False


class EmailSendPayload(BaseModel):
    recipients: List[str] | str
    subject: str
    body: str
    # Inline SMTP settings (now sent with each request, stored in browser)
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = 587
    username: Optional[str] = None
    password: Optional[str] = None
    from_address: Optional[str] = None
    use_tls: Optional[bool] = True


def get_email_settings(session: Session) -> EmailSettings:
    settings = session.get(EmailSettings, 1)
    if settings is None:
        settings = EmailSettings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


def serialize_email_settings(settings: EmailSettings) -> dict:
    return {
        "smtpServer": settings.smtp_server,
        "smtpPort": settings.smtp_port,
        "username": settings.username or "",
        "fromAddress": settings.from_address or "",
        "useTLS": settings.use_tls,
        "hasPassword": bool(settings.password),
    }


def normalize_recipients(raw: Sequence[str] | str) -> list[str]:
    if isinstance(raw, str):
        candidates = [raw]
    else:
        candidates = list(raw)

    recipients: list[str] = []
    for candidate in candidates:
        if not candidate:
            continue
        if isinstance(candidate, str):
            parts = candidate.replace(";", ",").split(",")
            for part in parts:
                normalized = part.strip()
                if normalized:
                    recipients.append(normalized)
    return recipients


def dispatch_email(
    smtp_server: str,
    smtp_port: int,
    from_address: str,
    recipients: list[str],
    subject: str,
    body: str,
    username: str | None = None,
    password: str | None = None,
    use_tls: bool = False
) -> dict:
    """
    Send an email via SMTP and verify the server response.

    Emails are sent anonymously without authentication by default.
    The server is expected to be a local or trusted SMTP relay.

    Returns a dict with 'sent_to' (list of successful recipients) and any 'refused' recipients.
    Raises ValueError for configuration issues, SMTPException for server errors.
    """
    if not smtp_server:
        raise ValueError("SMTP server is not configured. Please set the server address in settings.")
    if not from_address:
        raise ValueError("Sender address is not configured. Please set the From address in settings.")
    if not recipients:
        raise ValueError("At least one recipient is required")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = from_address
    message["To"] = ", ".join(recipients)
    message.set_content(body)

    try:
        with smtplib.SMTP(smtp_server, smtp_port, timeout=30) as smtp:
            # Check initial connection when supported
            if hasattr(smtp, "noop"):
                code, resp = smtp.noop()
                if code != 250:
                    raise smtplib.SMTPException(f"Server not ready: {code} {resp.decode()}")

            # Use STARTTLS only if explicitly requested
            if use_tls:
                try:
                    if hasattr(smtp, "starttls"):
                        result = smtp.starttls()
                        if isinstance(result, tuple):
                            code, resp = result
                            if code != 220:
                                logger.warning("STARTTLS failed with code %d, continuing without TLS", code)
                    else:
                        logger.info("Server does not support STARTTLS, sending without encryption")
                except smtplib.SMTPNotSupportedError:
                    logger.info("Server does not support STARTTLS, sending without encryption")

            # Only attempt login if credentials are provided (not typical for anonymous relay)
            if username and password:
                smtp.login(username, password)

            # send_message returns dict of refused recipients (empty = all accepted)
            refused = smtp.send_message(message)

            # Verify all recipients were accepted
            if refused:
                refused_addrs = list(refused.keys())
                logger.warning("Some recipients refused: %s", refused_addrs)
                if len(refused_addrs) == len(recipients):
                    raise smtplib.SMTPRecipientsRefused(refused)

            # Verify message was queued by checking server response
            # Issue a NOOP after sending to confirm connection is still good
            if hasattr(smtp, "noop"):
                code, resp = smtp.noop()
                if code != 250:
                    logger.warning("Post-send NOOP returned %d: %s", code, resp.decode())

            successful = [r for r in recipients if r not in (refused or {})]
            logger.info("Email sent successfully to %d recipient(s): %s", len(successful), successful)

            return {
                "sent_to": successful,
                "refused": list(refused.keys()) if refused else []
            }

    except smtplib.SMTPAuthenticationError as exc:
        logger.exception("SMTP authentication failed")
        raise ValueError(f"Authentication failed: {exc.smtp_error.decode() if exc.smtp_error else str(exc)}")
    except smtplib.SMTPRecipientsRefused as exc:
        logger.exception("All recipients refused")
        raise ValueError(f"All recipients refused by server")
    except smtplib.SMTPConnectError as exc:
        logger.exception("Failed to connect to SMTP server")
        raise ValueError(f"Could not connect to email server at {smtp_server}:{smtp_port}. Please check your settings.")
    except smtplib.SMTPException as exc:
        logger.exception("SMTP error sending email")
        raise exc
    except ConnectionRefusedError:
        logger.exception("Connection refused by SMTP server")
        raise ValueError(f"Connection refused by email server at {smtp_server}:{smtp_port}. Please verify the server is running.")
    except Exception as exc:
        logger.exception("Failed to send email")
        raise exc


class ChatRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class ChatMessage(BaseModel):
    role: ChatRole
    content: str


class ChatProvider(str, Enum):
    OPENAI = "openai"
    AZURE_OPENAI = "azure"


class ChatRequest(BaseModel):
    model: str = os.getenv("LLM_MODEL", "gpt-5.1")
    provider: Optional[ChatProvider] = None
    messages: List[ChatMessage] = PydanticField(..., min_items=1)
    response_format: Optional[dict] = None


app = FastAPI(title="Manity Portfolio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


def serialize_subtask(subtask: Subtask) -> dict:
    return {
        "id": subtask.id,
        "title": subtask.title,
        "status": subtask.status,
        "dueDate": subtask.dueDate,
        "completedDate": subtask.completedDate,
    }


def serialize_task(task: Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "dueDate": task.dueDate,
        "completedDate": task.completedDate,
        "subtasks": [serialize_subtask(st) for st in task.subtasks],
    }


def serialize_activity(activity: Activity) -> dict:
    return {
        "id": activity.id,
        "date": activity.date,
        "note": activity.note,
        "author": activity.author,
    }


def normalize_project_activity(project: Project) -> Project:
    if project.recentActivity is None:
        project.recentActivity = []

    project.recentActivity.sort(key=lambda a: a.date or "", reverse=True)

    if project.recentActivity:
        project.lastUpdate = project.recentActivity[0].note

    return project


def serialize_project(project: Project) -> dict:
    normalize_project_activity(project)

    return {
        "id": project.id,
        "name": project.name,
        "status": project.status,
        "priority": project.priority,
        "progress": project.progress,
        "lastUpdate": project.lastUpdate,
        "description": project.description,
        "executiveUpdate": project.executiveUpdate,
        "startDate": project.startDate,
        "targetDate": project.targetDate,
        "stakeholders": normalize_stakeholders(project.stakeholders),
        "plan": [serialize_task(task) for task in project.plan],
        "recentActivity": [serialize_activity(activity) for activity in project.recentActivity],
    }


def apply_task_payload(task: Task, payload: TaskPayload) -> Task:
    task.title = payload.title
    task.status = payload.status
    task.dueDate = payload.dueDate
    task.completedDate = payload.completedDate
    if task.subtasks is None:
        task.subtasks = []
    else:
        task.subtasks.clear()
    for subtask_payload in payload.subtasks:
        subtask = Subtask(
            id=subtask_payload.id or generate_id("subtask"),
            title=subtask_payload.title,
            status=subtask_payload.status,
            dueDate=subtask_payload.dueDate,
            completedDate=subtask_payload.completedDate,
        )
        task.subtasks.append(subtask)
    return task


def upsert_project(session: Session, payload: ProjectPayload) -> Project:
    project = session.exec(select(Project).where(Project.id == payload.id)).first() if payload.id else None
    if project is None:
        project = Project(id=payload.id or generate_id("project"))
        session.add(project)

    project.name = payload.name
    project.status = payload.status
    project.priority = payload.priority
    project.progress = payload.progress
    project.lastUpdate = payload.lastUpdate
    project.description = payload.description
    project.executiveUpdate = payload.executiveUpdate
    project.startDate = payload.startDate
    project.targetDate = payload.targetDate
    project.stakeholders = normalize_stakeholders(payload.stakeholders)

    if project.plan is None:
        project.plan = []
    else:
        project.plan.clear()
    for task_payload in payload.plan:
        task = Task(
            id=task_payload.id or generate_id("task"),
            title=task_payload.title,
            status=task_payload.status,
            dueDate=task_payload.dueDate,
            completedDate=task_payload.completedDate,
        )
        apply_task_payload(task, task_payload)
        project.plan.append(task)

    if project.recentActivity is None:
        project.recentActivity = []
    else:
        project.recentActivity.clear()
    activity_payloads = sorted(
        payload.recentActivity,
        key=lambda activity: activity.date or "",
        reverse=True,
    )

    for activity_payload in activity_payloads:
        activity = Activity(
            id=activity_payload.id or generate_id("activity"),
            date=activity_payload.date,
            note=activity_payload.note,
            author=activity_payload.author,
        )
        project.recentActivity.append(activity)

    normalize_project_activity(project)

    session.add(project)
    session.commit()
    # Reload project with all relationships properly loaded
    return load_project(session, project.id)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()
    with Session(engine) as session:
        existing = session.exec(select(Project)).first()
        if existing:
            return

        default_projects = [
            ProjectPayload(
                name="Website Redesign",
                status="active",
                priority="high",
                progress=45,
                lastUpdate="Completed homepage mockups and testing",
                description="Overhaul of company site for better UX.",
                executiveUpdate="Overhaul of company site for better UX.",
                startDate="2025-10-15",
                targetDate="2025-12-20",
                stakeholders=[Stakeholder(name="Sarah Chen", team="Design"), Stakeholder(name="Marcus Rodriguez", team="Development")],
                plan=[
                    TaskPayload(
                        title="Discovery & Research",
                        status="completed",
                        dueDate="2025-11-01",
                        completedDate="2025-11-01",
                        subtasks=[
                            SubtaskPayload(title="Competitive analysis", status="completed", completedDate="2025-10-22", dueDate="2025-10-22"),
                            SubtaskPayload(title="User interviews", status="completed", completedDate="2025-10-28", dueDate="2025-10-28"),
                        ],
                    ),
                    TaskPayload(
                        title="Design Phase",
                        status="in-progress",
                        dueDate="2025-12-05",
                        subtasks=[
                            SubtaskPayload(title="Homepage mockups", status="completed", completedDate="2025-11-28", dueDate="2025-11-28"),
                            SubtaskPayload(title="Product page designs", status="in-progress", dueDate="2025-12-03"),
                        ],
                    ),
                ],
                recentActivity=[
                    ActivityPayload(date="2025-11-29T14:30:00", note="Positive feedback on homepage direction", author="You"),
                    ActivityPayload(date="2025-11-28T16:15:00", note="Completed homepage mockups", author="You"),
                ],
            ),
            ProjectPayload(
                name="Q4 Marketing Campaign",
                status="active",
                priority="medium",
                progress=30,
                lastUpdate="Draft content calendar completed",
                description="Multi-channel campaign for Q4.",
                executiveUpdate="Multi-channel campaign for Q4.",
                startDate="2025-11-01",
                targetDate="2025-12-31",
                stakeholders=[Stakeholder(name="Jennifer Liu", team="Marketing"), Stakeholder(name="Alex Thompson", team="Creative")],
                plan=[
                    TaskPayload(
                        title="Campaign Strategy",
                        status="completed",
                        dueDate="2025-11-15",
                        completedDate="2025-11-15",
                        subtasks=[
                            SubtaskPayload(title="Define target audience", status="completed", completedDate="2025-11-05", dueDate="2025-11-05"),
                            SubtaskPayload(title="Set campaign goals", status="completed", completedDate="2025-11-10", dueDate="2025-11-10"),
                        ],
                    ),
                ],
                recentActivity=[
                    ActivityPayload(date="2025-11-27T16:30:00", note="Met with marketing to discuss timeline", author="You"),
                ],
            ),
        ]

        for project_payload in default_projects:
            upsert_project(session, project_payload)


def load_project(session: Session, project_id: str) -> Project:
    statement = (
        select(Project)
        .where(Project.id == project_id)
        .options(
            selectinload(Project.plan).selectinload(Task.subtasks),
            selectinload(Project.recentActivity),
        )
    )
    project = session.exec(statement).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@app.get("/people")
def list_people(session: Session = Depends(get_session)):
    statement = select(Person)
    people = session.exec(statement).all()

    unique_people: dict[str, Person] = {}
    for person in people:
        key = person.name.lower()
        if key not in unique_people:
            unique_people[key] = person
            continue

        # Collapse legacy duplicates by preferring the first encountered record
        legacy = unique_people[key]
        legacy.team = legacy.team or person.team
        legacy.email = legacy.email or person.email
        session.delete(person)

    session.commit()
    return [serialize_person(person) for person in unique_people.values()]


@app.post("/people", status_code=status.HTTP_201_CREATED)
def create_person(payload: PersonPayload, request: Request, session: Session = Depends(get_session)):
    person = upsert_person_from_payload(session, payload)
    log_action(session, "create_person", "person", person.id, {"name": person.name, "team": person.team}, request)
    return serialize_person(person)


@app.get("/people/{person_id}")
def get_person(person_id: str, session: Session = Depends(get_session)):
    person = session.exec(select(Person).where(Person.id == person_id)).first()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    return serialize_person(person)


@app.put("/people/{person_id}")
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


@app.delete("/people/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: str, request: Request, session: Session = Depends(get_session)):
    person = session.exec(select(Person).where(Person.id == person_id)).first()
    if not person:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    deleted_data = {"name": person.name, "team": person.team}
    session.delete(person)
    session.commit()
    log_action(session, "delete_person", "person", person_id, deleted_data, request)
    return None


@app.get("/settings/email", response_model=EmailSettingsResponse)
def read_email_settings(session: Session = Depends(get_session)):
    settings = get_email_settings(session)
    return serialize_email_settings(settings)


@app.put("/settings/email", response_model=EmailSettingsResponse)
def update_email_settings(payload: EmailSettingsPayload, session: Session = Depends(get_session)):
    settings = get_email_settings(session)
    settings.smtp_server = payload.smtpServer
    settings.smtp_port = payload.smtpPort
    settings.username = payload.username or None
    settings.from_address = payload.fromAddress or None
    settings.use_tls = payload.useTLS

    if payload.password is not None:
        settings.password = payload.password

    session.add(settings)
    session.commit()
    session.refresh(settings)
    return serialize_email_settings(settings)


@app.post("/actions/email", status_code=status.HTTP_202_ACCEPTED)
def send_email_action(payload: EmailSendPayload, request: Request, session: Session = Depends(get_session)):
    """
    Send an email and verify server acceptance.

    SMTP settings are now passed inline with each request (stored in browser localStorage).
    Returns 200 with sent_to list on success.
    Returns 400 for configuration/validation errors.
    Returns 502 for SMTP server errors.
    """
    recipients = normalize_recipients(payload.recipients)

    settings = get_email_settings(session)

    smtp_server = payload.smtp_server or settings.smtp_server
    smtp_port = payload.smtp_port or settings.smtp_port
    from_address = payload.from_address or settings.from_address
    username = payload.username if payload.username is not None else settings.username
    password = payload.password if payload.password is not None else settings.password
    use_tls = payload.use_tls if payload.use_tls is not None else settings.use_tls

    try:
        result = dispatch_email(
            smtp_server=smtp_server or "",
            smtp_port=smtp_port or 587,
            from_address=from_address or "",
            recipients=recipients,
            subject=payload.subject,
            body=payload.body,
            username=username,
            password=password,
            use_tls=use_tls if use_tls is not None else True
        )
    except ValueError as exc:
        log_action(session, "send_email_failed", "email", None, {"error": str(exc), "recipient_count": len(recipients)}, request)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except smtplib.SMTPException as exc:
        log_action(session, "send_email_failed", "email", None, {"error": str(exc), "recipient_count": len(recipients)}, request)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"SMTP error: {str(exc)}")

    log_action(session, "send_email", "email", None, {"recipient_count": len(result["sent_to"]), "subject_preview": payload.subject[:50] if payload.subject else None}, request)

    # Return detailed result including which recipients were successful
    return {
        "status": "sent",
        "sent_to": result["sent_to"],
        "refused": result["refused"],
        "message": f"Email delivered to {len(result['sent_to'])} recipient(s)"
    }


@app.get("/projects")
def list_projects(session: Session = Depends(get_session)):
    statement = select(Project).options(
        selectinload(Project.plan).selectinload(Task.subtasks),
        selectinload(Project.recentActivity),
    )
    projects = session.exec(statement).all()
    return [serialize_project(project) for project in projects]


@app.post("/projects", status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectPayload, request: Request, session: Session = Depends(get_session)):
    project = upsert_project(session, payload)
    log_action(session, "create_project", "project", project.id, {"name": project.name, "status": project.status}, request)
    return serialize_project(project)


@app.get("/projects/{project_id}")
def get_project(project_id: str, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    return serialize_project(project)


@app.put("/projects/{project_id}")
def update_project(project_id: str, payload: ProjectPayload, request: Request, session: Session = Depends(get_session)):
    if payload.id and payload.id != project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project ID mismatch")
    payload.id = project_id
    project = upsert_project(session, payload)
    log_action(session, "update_project", "project", project_id, {"name": project.name, "status": project.status}, request)
    return serialize_project(project)


@app.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    deleted_data = {"name": project.name}
    session.delete(project)
    session.commit()
    log_action(session, "delete_project", "project", project_id, deleted_data, request)
    return None


@app.post("/projects/{project_id}/tasks")
def create_task(project_id: str, payload: TaskPayload, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    task = Task(
        id=payload.id or generate_id("task"),
        title=payload.title,
        status=payload.status,
        dueDate=payload.dueDate,
        completedDate=payload.completedDate,
        project_id=project.id,
    )
    apply_task_payload(task, payload)
    session.add(task)
    session.commit()
    session.refresh(task)
    log_action(session, "create_task", "task", task.id, {"project_id": project_id, "title": task.title}, request)
    return serialize_project(load_project(session, project_id))


@app.put("/projects/{project_id}/tasks/{task_id}")
def update_task(project_id: str, task_id: str, payload: TaskPayload, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    task = session.exec(select(Task).where(Task.id == task_id, Task.project_id == project.id)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    old_status = task.status
    apply_task_payload(task, payload)
    session.add(task)
    session.commit()
    log_action(session, "update_task", "task", task_id, {"project_id": project_id, "title": task.title, "old_status": old_status, "new_status": task.status}, request)
    return serialize_project(load_project(session, project_id))


@app.delete("/projects/{project_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_task(project_id: str, task_id: str, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    task = session.exec(select(Task).where(Task.id == task_id, Task.project_id == project.id)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    deleted_data = {"project_id": project_id, "title": task.title}
    session.delete(task)
    session.commit()
    log_action(session, "delete_task", "task", task_id, deleted_data, request)
    return None


@app.post("/projects/{project_id}/tasks/{task_id}/subtasks")
def create_subtask(project_id: str, task_id: str, payload: SubtaskPayload, request: Request, session: Session = Depends(get_session)):
    load_project(session, project_id)
    task = session.exec(select(Task).where(Task.id == task_id, Task.project_id == project_id)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    subtask = Subtask(
        id=payload.id or generate_id("subtask"),
        title=payload.title,
        status=payload.status,
        dueDate=payload.dueDate,
        completedDate=payload.completedDate,
        task_id=task.id,
    )
    session.add(subtask)
    session.commit()
    log_action(session, "create_subtask", "subtask", subtask.id, {"project_id": project_id, "task_id": task_id, "title": subtask.title}, request)
    return serialize_project(load_project(session, project_id))


@app.put("/projects/{project_id}/tasks/{task_id}/subtasks/{subtask_id}")
def update_subtask(project_id: str, task_id: str, subtask_id: str, payload: SubtaskPayload, request: Request, session: Session = Depends(get_session)):
    load_project(session, project_id)
    subtask = session.exec(select(Subtask).where(Subtask.id == subtask_id, Subtask.task_id == task_id)).first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    old_status = subtask.status
    subtask.title = payload.title
    subtask.status = payload.status
    subtask.dueDate = payload.dueDate
    subtask.completedDate = payload.completedDate
    session.add(subtask)
    session.commit()
    log_action(session, "update_subtask", "subtask", subtask_id, {"project_id": project_id, "task_id": task_id, "title": subtask.title, "old_status": old_status, "new_status": subtask.status}, request)
    return serialize_project(load_project(session, project_id))


@app.delete("/projects/{project_id}/tasks/{task_id}/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subtask(project_id: str, task_id: str, subtask_id: str, request: Request, session: Session = Depends(get_session)):
    load_project(session, project_id)
    subtask = session.exec(select(Subtask).where(Subtask.id == subtask_id, Subtask.task_id == task_id)).first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    deleted_data = {"project_id": project_id, "task_id": task_id, "title": subtask.title}
    session.delete(subtask)
    session.commit()
    log_action(session, "delete_subtask", "subtask", subtask_id, deleted_data, request)
    return None


@app.post("/projects/{project_id}/activities")
def create_activity(project_id: str, payload: ActivityPayload, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    activity = Activity(
        id=payload.id or generate_id("activity"),
        date=payload.date,
        note=payload.note,
        author=payload.author,
        project_id=project.id,
    )
    session.add(activity)
    session.commit()
    project = load_project(session, project_id)
    normalize_project_activity(project)
    session.add(project)
    session.commit()
    log_action(session, "create_activity", "activity", activity.id, {"project_id": project_id, "author": activity.author, "note_preview": activity.note[:100] if activity.note else None}, request)
    return serialize_project(load_project(session, project_id))


@app.put("/projects/{project_id}/activities/{activity_id}")
def update_activity(project_id: str, activity_id: str, payload: ActivityPayload, request: Request, session: Session = Depends(get_session)):
    load_project(session, project_id)
    activity = session.exec(select(Activity).where(Activity.id == activity_id, Activity.project_id == project_id)).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    activity.note = payload.note
    activity.date = payload.date
    activity.author = payload.author
    session.add(activity)
    session.commit()
    project = load_project(session, project_id)
    normalize_project_activity(project)
    session.add(project)
    session.commit()
    log_action(session, "update_activity", "activity", activity_id, {"project_id": project_id, "author": activity.author}, request)
    return serialize_project(load_project(session, project_id))


@app.delete("/projects/{project_id}/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(project_id: str, activity_id: str, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    activity = session.exec(select(Activity).where(Activity.id == activity_id, Activity.project_id == project_id)).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    deleted_data = {"project_id": project_id, "author": activity.author}
    session.delete(activity)
    session.commit()
    project = load_project(session, project_id)
    normalize_project_activity(project)
    session.add(project)
    session.commit()
    log_action(session, "delete_activity", "activity", activity_id, deleted_data, request)
    return None


@app.get("/export")
def export_portfolio(project_id: Optional[str] = None, session: Session = Depends(get_session)):
    projects = []
    if project_id:
        projects.append(serialize_project(load_project(session, project_id)))
    else:
        projects = list_projects(session)

    people = list_people(session)

    def iter_payload():
        yield "{\n"
        yield f"  \"version\": 1,\n"
        yield f"  \"exportedAt\": \"{datetime.utcnow().isoformat()}\",\n"
        yield "  \"projects\": "
        import json
        yield json.dumps(projects, indent=2)
        yield ",\n"
        yield "  \"people\": "
        yield json.dumps(people, indent=2)
        yield "\n}"

    return StreamingResponse(iter_payload(), media_type="application/json")


@app.post("/import")
async def import_portfolio(
    request: Request,
    payload: ImportPayload | None = Body(None),
    file: UploadFile | None = File(None),
    mode: str = "replace",
    session: Session = Depends(get_session),
):
    resolved_mode = mode

    if payload is None:
        if file is not None:
            try:
                import json

                data = json.loads(file.file.read())
                if "mode" not in data:
                    data["mode"] = resolved_mode
                payload = ImportPayload(**data)
            except Exception as exc:  # pragma: no cover - defensive
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid import file: {exc}")
        else:
            try:
                import json

                raw_body = await request.body()
                if raw_body:
                    data = json.loads(raw_body)
                    if "mode" not in data:
                        data["mode"] = resolved_mode
                    payload = ImportPayload(**data)
            except Exception as exc:  # pragma: no cover - defensive
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid import file: {exc}")

    if payload is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No import payload provided")

    if "mode" not in payload.model_fields_set:
        payload = payload.model_copy(update={"mode": resolved_mode})

    if payload.mode not in {"replace", "merge"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid import mode")

    existing_projects = {project.id: project for project in session.exec(select(Project)).all()}
    existing_people = {person.id: person for person in session.exec(select(Person)).all()}

    if payload.mode == "replace":
        session.exec(delete(Subtask))
        session.exec(delete(Task))
        session.exec(delete(Activity))
        session.exec(delete(Project))
        session.exec(delete(Person))
        session.commit()
        existing_projects = {}
        existing_people = {}

    for project_payload in payload.projects:
        if payload.mode == "merge" and project_payload.id in existing_projects:
            session.delete(existing_projects[project_payload.id])
            session.commit()
        upsert_project(session, project_payload)

    for person_payload in payload.people:
        if payload.mode == "merge" and person_payload.id in existing_people:
            session.delete(existing_people[person_payload.id])
            session.commit()

        upsert_person_from_payload(session, person_payload)

    projects = list_projects(session)
    people = list_people(session)

    log_action(session, "import_portfolio", "portfolio", None, {"mode": payload.mode, "project_count": len(payload.projects), "people_count": len(payload.people)}, request)

    return {"projects": projects, "people": people}


def _resolve_provider(provider_override: ChatProvider | None) -> ChatProvider:
    if provider_override:
        return provider_override

    env_provider = os.getenv("LLM_PROVIDER", ChatProvider.OPENAI.value)
    try:
        return ChatProvider(env_provider.lower())
    except ValueError as exc:  # pragma: no cover - defensive
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unsupported LLM provider configured: {env_provider}",
        ) from exc


def _build_llm_request(payload: ChatRequest) -> tuple[str, dict, dict]:
    provider = _resolve_provider(payload.provider)

    request_body = {
        "model": payload.model,
        "messages": [message.model_dump() for message in payload.messages],
    }

    if payload.response_format is not None:
        request_body["response_format"] = payload.response_format

    if provider is ChatProvider.OPENAI:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenAI API key not configured on server",
            )

        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        url = f"{base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        return url, headers, request_body

    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").rstrip("/")
    deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")

    if not api_key or not endpoint or not deployment:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Azure OpenAI configuration is incomplete",
        )

    url = (
        f"{endpoint}/openai/deployments/{deployment}/chat/completions"
        f"?api-version={api_version}"
    )
    headers = {
        "Content-Type": "application/json",
        "api-key": api_key,
    }
    return url, headers, request_body


@app.post("/api/llm/chat")
async def proxy_llm_chat(payload: ChatRequest, request: Request, session: Session = Depends(get_session)):
    url, headers, request_body = _build_llm_request(payload)

    # Log the conversation request (messages without exposing full content for privacy)
    message_summary = [{"role": m.role.value, "content_length": len(m.content)} for m in payload.messages]

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, headers=headers, json=request_body)
    except httpx.HTTPError as exc:  # pragma: no cover - network safeguard
        log_action(session, "llm_chat_error", "llm", None, {"model": payload.model, "error": str(exc), "message_count": len(payload.messages)}, request)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream request failed: {exc}",
        ) from exc

    if response.status_code >= 400:
        log_action(session, "llm_chat_error", "llm", None, {"model": payload.model, "status_code": response.status_code, "message_count": len(payload.messages)}, request)
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

    # Log successful LLM conversation with full messages and response for auditing
    import json
    conversation_log = {
        "model": payload.model,
        "messages": [{"role": m.role.value, "content": m.content} for m in payload.messages],
        "response": content,
        "usage": data.get("usage", {})
    }
    log_action(session, "llm_chat", "llm", None, conversation_log, request)

    return {"content": content, "raw": data}


@app.get("/")
def root():
    return {"status": "ok"}
