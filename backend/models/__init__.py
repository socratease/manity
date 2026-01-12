"""
Models module for the Manity application.

This module contains all SQLModel definitions organized by domain:
- person: Person-related models
- project: Project, Task, and Subtask models
- initiative: Initiative models for grouping projects
- activity: Activity/update models
- settings: Email settings, audit log, and migration state
"""

# Person models
from .person import Person, PersonBase, PersonReference

# Project models
from .project import (
    Project,
    ProjectBase,
    ProjectPersonLink,
    Stakeholder,
    Subtask,
    SubtaskBase,
    Task,
    TaskBase,
)

# Initiative models
from .initiative import Initiative, InitiativeBase, InitiativePersonLink

# Activity models
from .activity import Activity, ActivityBase

# Settings and system models
from .settings import AuditLog, EmailSettings, MigrationState

__all__ = [
    # Person models
    "Person",
    "PersonBase",
    "PersonReference",
    # Project models
    "Project",
    "ProjectBase",
    "ProjectPersonLink",
    "Stakeholder",
    "Subtask",
    "SubtaskBase",
    "Task",
    "TaskBase",
    # Initiative models
    "Initiative",
    "InitiativeBase",
    "InitiativePersonLink",
    # Activity models
    "Activity",
    "ActivityBase",
    # Settings models
    "AuditLog",
    "EmailSettings",
    "MigrationState",
]
