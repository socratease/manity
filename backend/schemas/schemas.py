from typing import List, Optional
from pydantic import BaseModel, Field as PydanticField, field_validator
from sqlmodel import SQLModel
from ..models.models import (
    PersonBase, SubtaskBase, TaskBase, ActivityBase,
    Stakeholder, PersonReference, ProjectBase
)

class PersonPayload(PersonBase):
    id: Optional[str] = None

class AssigneePayload(BaseModel):
    """Assignee information - can include id, name, or both"""
    id: Optional[str] = None
    name: Optional[str] = None
    team: Optional[str] = None

class TaskContextPayload(BaseModel):
    """Task context for comments on tasks/subtasks"""
    taskId: str
    subtaskId: Optional[str] = None
    taskTitle: str
    subtaskTitle: Optional[str] = None

class SubtaskPayload(SubtaskBase):
    id: Optional[str] = None
    assignee: Optional[AssigneePayload] = None

class TaskPayload(TaskBase):
    id: Optional[str] = None
    subtasks: List[SubtaskPayload] = PydanticField(default_factory=list)
    assignee: Optional[AssigneePayload] = None

class ActivityPayload(ActivityBase):
    id: Optional[str] = None
    taskContext: Optional[TaskContextPayload] = None
    authorEmail: Optional[str] = None

class ProjectPayload(SQLModel):
    name: str
    status: str = "planning"
    priority: str = "medium"
    progress: int = 0
    lastUpdate: Optional[str] = None
    description: str = ""
    executiveUpdate: Optional[str] = None
    startDate: Optional[str] = None
    targetDate: Optional[str] = None
    stakeholders: List[PersonReference] = PydanticField(default_factory=list)
    id: Optional[str] = None
    plan: List[TaskPayload] = PydanticField(default_factory=list)
    recentActivity: List[ActivityPayload] = PydanticField(default_factory=list)

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, v):
        if v is None:
            raise ValueError("Project name cannot be null")
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("Project name cannot be empty")
        return v

class ImportPayload(BaseModel):
    projects: List[ProjectPayload]
    people: List[PersonPayload] = PydanticField(default_factory=list)
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

# Chat Schemas
from enum import Enum

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
    # Removed unnecessary import and fixed type annotation issue
    model: str = "gpt-5.1" # Default fallback
    provider: Optional[ChatProvider] = None
    messages: List[ChatMessage] = PydanticField(..., min_length=1)
    response_format: Optional[dict] = None

# Slide Export Schemas
class SlideTaskItem(BaseModel):
    title: str
    date: str

class SlideUpdateItem(BaseModel):
    author: str
    date: str
    note: str

class SlideStakeholder(BaseModel):
    name: str
    team: str = ""

class SlideData(BaseModel):
    name: str
    description: str = ""
    executiveUpdate: str = ""
    targetDate: Optional[str] = None
    priority: str = "medium"
    status: str = "active"
    stakeholders: List[SlideStakeholder] = PydanticField(default_factory=list)
    recentlyCompleted: List[SlideTaskItem] = PydanticField(default_factory=list)
    nextUp: List[SlideTaskItem] = PydanticField(default_factory=list)
    recentUpdates: List[SlideUpdateItem] = PydanticField(default_factory=list)

class SlidesExportPayload(BaseModel):
    slides: List[SlideData]
