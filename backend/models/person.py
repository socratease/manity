"""Person models for the Manity application."""

from typing import Optional, TYPE_CHECKING

from sqlalchemy import Column, String
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .project import Project, ProjectPersonLink


class PersonReference(SQLModel):
    """Reference to a person with basic information."""
    id: Optional[str] = None
    name: Optional[str] = None
    team: Optional[str] = None
    email: Optional[str] = None


class PersonBase(SQLModel):
    """Base model for Person with common fields."""
    name: str = Field(sa_column=Column(String, unique=True, index=True))
    team: str = ""
    email: Optional[str] = None


class Person(PersonBase, table=True):
    """Person entity representing stakeholders, assignees, and team members."""
    id: Optional[str] = Field(default=None, primary_key=True)
    projects: list["Project"] = Relationship(
        back_populates="stakeholders",
        link_model="ProjectPersonLink",
    )
