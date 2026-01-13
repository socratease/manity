"""Settings and system models for the Manity application."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String
from sqlmodel import Field, SQLModel


class EmailSettings(SQLModel, table=True):
    """Email configuration settings."""
    id: Optional[int] = Field(default=1, primary_key=True)
    smtp_server: str = ""
    smtp_port: int = 587
    use_tls: bool = True
    from_address: Optional[str] = None


class AuditLog(SQLModel, table=True):
    """Audit log for tracking all actions and AI conversations."""
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
