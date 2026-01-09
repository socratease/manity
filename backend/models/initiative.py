"""Initiative models for the Manity application."""

from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, String
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .person import Person
    from .project import Project


class InitiativePersonLink(SQLModel, table=True):
    """Link table for many-to-many relationship between Initiatives and People (owners)."""
    initiative_id: str = Field(
        sa_column=Column("initiative_id", String, ForeignKey("initiative.id", ondelete="CASCADE"), primary_key=True, nullable=False),
    )
    person_id: str = Field(
        sa_column=Column("person_id", String, ForeignKey("person.id", ondelete="CASCADE"), primary_key=True, nullable=False),
    )


class InitiativeBase(SQLModel):
    """Base model for Initiative with common fields."""
    name: str = Field(sa_column=Column(String, unique=True, index=True))
    description: str = ""
    status: str = "planning"  # planning | active | on-hold | cancelled | completed
    priority: str = "medium"  # high | medium | low
    startDate: Optional[str] = None
    targetDate: Optional[str] = None


class Initiative(InitiativeBase, table=True):
    """Initiative entity - a meta-project that groups related projects."""
    id: Optional[str] = Field(default=None, primary_key=True)

    # Relationships
    projects: List["Project"] = Relationship(back_populates="initiative")
    owners: List["Person"] = Relationship(
        back_populates="owned_initiatives",
        link_model=InitiativePersonLink,
    )
