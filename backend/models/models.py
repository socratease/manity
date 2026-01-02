from typing import List, Optional
from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.sqlite import JSON

class ProjectPersonLink(SQLModel, table=True):
    project_id: str = Field(
        sa_column=Column("project_id", String, ForeignKey("project.id", ondelete="CASCADE"), primary_key=True, nullable=False),
    )
    person_id: str = Field(
        sa_column=Column("person_id", String, ForeignKey("person.id", ondelete="CASCADE"), primary_key=True, nullable=False),
    )

class PersonBase(SQLModel):
    name: str = Field(sa_column=Column(String, unique=True, index=True))
    team: str = ""
    email: Optional[str] = None

class Person(PersonBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    projects: list["Project"] = Relationship(
        back_populates="stakeholders",
        link_model=ProjectPersonLink,
    )

class PersonReference(SQLModel):
    id: Optional[str] = None
    name: Optional[str] = None
    team: Optional[str] = None
    email: Optional[str] = None

class SubtaskBase(SQLModel):
    title: str
    status: str = "todo"
    dueDate: Optional[str] = None
    completedDate: Optional[str] = None
    assignee_id: Optional[str] = Field(
        default=None,
        sa_column=Column("assignee_id", String, ForeignKey("person.id", ondelete="SET NULL"), nullable=True),
        description="Person responsible for this subtask",
        alias="assigneeId",
    )

class Subtask(SubtaskBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    task_id: Optional[str] = Field(default=None, foreign_key="task.id")
    assignee_id: Optional[str] = Field(default=None, foreign_key="person.id")
    task: "Task" = Relationship(back_populates="subtasks")
    assignee: Optional["Person"] = Relationship(sa_relationship_kwargs={"lazy": "joined"})

class TaskBase(SQLModel):
    title: str
    status: str = "todo"
    dueDate: Optional[str] = None
    completedDate: Optional[str] = None
    assignee_id: Optional[str] = Field(
        default=None,
        sa_column=Column("assignee_id", String, ForeignKey("person.id", ondelete="SET NULL"), nullable=True),
        description="Person responsible for this task",
        alias="assigneeId",
    )

class Task(TaskBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")
    assignee_id: Optional[str] = Field(default=None, foreign_key="person.id")
    project: "Project" = Relationship(back_populates="plan")
    assignee: Optional["Person"] = Relationship(sa_relationship_kwargs={"lazy": "joined"})
    subtasks: list[Subtask] = Relationship(
        back_populates="task",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )

class ActivityBase(SQLModel):
    date: str
    note: str
    author: Optional[str] = None
    author_id: Optional[str] = Field(
        default=None,
        sa_column=Column("author_id", String, ForeignKey("person.id", ondelete="SET NULL"), nullable=True),
        alias="authorId",
    )

class Activity(ActivityBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")
    # Store task context as JSON for comments on tasks/subtasks
    task_context: Optional[str] = Field(default=None, sa_column=Column(String))
    project: "Project" = Relationship(back_populates="recentActivity")
    author_person: Optional["Person"] = Relationship(sa_relationship_kwargs={"lazy": "joined"})

# For legacy data support
from pydantic import BaseModel
class Stakeholder(BaseModel):
    id: str | None = None
    name: str
    team: str = ""
    email: str | None = None

class ProjectBase(SQLModel):
    name: str = Field(sa_column=Column(String, unique=True, index=True))
    status: str = "planning"
    priority: str = "medium"
    progress: int = 0
    lastUpdate: Optional[str] = None
    description: str = ""
    executiveUpdate: Optional[str] = None
    startDate: Optional[str] = None
    targetDate: Optional[str] = None
    # stakeholders_legacy is kept for migration purposes but should be phased out
    stakeholders_legacy: List[Stakeholder] = Field(
        default_factory=list,
        sa_column=Column("stakeholders", JSON, nullable=True),
    )

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
    stakeholders: list["Person"] = Relationship(
        back_populates="projects",
        link_model=ProjectPersonLink,
    )

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

class MigrationState(SQLModel, table=True):
    """Track lightweight migrations run in-application."""
    key: str = Field(primary_key=True)
    applied_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
