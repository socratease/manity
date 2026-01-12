"""Project, Task, and Subtask models for the Manity application."""

from typing import Optional, List, TYPE_CHECKING

from pydantic import BaseModel
from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.sqlite import JSON
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .person import Person
    from .activity import Activity
    from .initiative import Initiative


class Stakeholder(BaseModel):
    """Stakeholder information (Pydantic model)."""
    id: str | None = None
    name: str
    team: str = ""
    email: str | None = None


class ProjectPersonLink(SQLModel, table=True):
    """Link table for many-to-many relationship between Projects and People."""
    project_id: str = Field(
        sa_column=Column("project_id", String, ForeignKey("project.id", ondelete="CASCADE"), primary_key=True, nullable=False),
    )
    person_id: str = Field(
        sa_column=Column("person_id", String, ForeignKey("person.id", ondelete="CASCADE"), primary_key=True, nullable=False),
    )


class SubtaskBase(SQLModel):
    """Base model for Subtask with common fields."""
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
    """Subtask entity representing a sub-item of a task."""
    id: Optional[str] = Field(default=None, primary_key=True)
    task_id: Optional[str] = Field(default=None, foreign_key="task.id")
    assignee_id: Optional[str] = Field(default=None, foreign_key="person.id")
    task: "Task" = Relationship(back_populates="subtasks")
    assignee: Optional["Person"] = Relationship(sa_relationship_kwargs={"lazy": "joined"})


class TaskBase(SQLModel):
    """Base model for Task with common fields."""
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
    """Task entity representing a work item in a project plan."""
    id: Optional[str] = Field(default=None, primary_key=True)
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")
    assignee_id: Optional[str] = Field(default=None, foreign_key="person.id")
    project: "Project" = Relationship(back_populates="plan")
    assignee: Optional["Person"] = Relationship(sa_relationship_kwargs={"lazy": "joined"})
    subtasks: list[Subtask] = Relationship(
        back_populates="task",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class ProjectBase(SQLModel):
    """Base model for Project with common fields."""
    name: str = Field(sa_column=Column(String, unique=True, index=True))
    status: str = "planning"
    priority: str = "medium"
    progress: int = 0
    lastUpdate: Optional[str] = None
    description: str = ""
    executiveUpdate: Optional[str] = None
    startDate: Optional[str] = None
    targetDate: Optional[str] = None
    stakeholders_legacy: List[Stakeholder] = Field(
        default_factory=list,
        sa_column=Column("stakeholders", JSON, nullable=True),
    )


class Project(ProjectBase, table=True):
    """Project entity representing a portfolio project."""
    id: Optional[str] = Field(default=None, primary_key=True)
    initiative_id: Optional[str] = Field(
        default=None,
        sa_column=Column("initiative_id", String, ForeignKey("initiative.id", ondelete="SET NULL"), nullable=True),
    )
    plan: list[Task] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    recentActivity: list["Activity"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    stakeholders: list["Person"] = Relationship(
        back_populates="projects",
        link_model=ProjectPersonLink,
    )
    initiative: Optional["Initiative"] = Relationship(back_populates="projects")
