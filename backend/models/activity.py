"""Activity models for the Manity application."""

from typing import Optional, TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, String
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .project import Project
    from .person import Person


class ActivityBase(SQLModel):
    """Base model for Activity with common fields."""
    date: str
    note: str
    author: Optional[str] = None
    author_id: Optional[str] = Field(
        default=None,
        sa_column=Column("author_id", String, ForeignKey("person.id", ondelete="SET NULL"), nullable=True),
        alias="authorId",
    )


class Activity(ActivityBase, table=True):
    """Activity entity representing a project update or comment."""
    id: Optional[str] = Field(default=None, primary_key=True)
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")
    # Store task context as JSON for comments on tasks/subtasks
    task_context: Optional[str] = Field(default=None, sa_column=Column(String))
    project: "Project" = Relationship(back_populates="recentActivity")
    author_person: Optional["Person"] = Relationship(sa_relationship_kwargs={"lazy": "joined"})
