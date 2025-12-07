from __future__ import annotations

import os
import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional

from fastapi import Body, Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field as PydanticField
import httpx
from sqlalchemy import Column, delete
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import selectinload
from sqlmodel import Field, Relationship, SQLModel, Session, create_engine, select

DATABASE_URL = "sqlite:///./portfolio.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def generate_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


class Stakeholder(BaseModel):
    name: str
    team: str


class SubtaskBase(SQLModel):
    title: str
    status: str = "todo"
    dueDate: Optional[str] = None
    completedDate: Optional[str] = None


class Subtask(SubtaskBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    task_id: Optional[str] = Field(default=None, foreign_key="task.id")
    task: "Task | None" = Relationship(back_populates="subtasks")


class TaskBase(SQLModel):
    title: str
    status: str = "todo"
    dueDate: Optional[str] = None
    completedDate: Optional[str] = None


class Task(TaskBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")
    project: "Project | None" = Relationship(back_populates="plan")
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
    project: "Project | None" = Relationship(back_populates="recentActivity")


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


class SubtaskPayload(SubtaskBase):
    id: Optional[str] = None


class TaskPayload(TaskBase):
    id: Optional[str] = None
    subtasks: List[SubtaskPayload] = Field(default_factory=list)


class ActivityPayload(ActivityBase):
    id: Optional[str] = None


class ProjectPayload(ProjectBase):
    id: Optional[str] = None
    plan: List[TaskPayload] = Field(default_factory=list)
    recentActivity: List[ActivityPayload] = Field(default_factory=list)


class ImportPayload(BaseModel):
    projects: List[ProjectPayload]
    mode: str = "replace"


class ChatRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class ChatMessage(BaseModel):
    role: ChatRole
    content: str


class ChatRequest(BaseModel):
    model: str = "gpt-5.1"
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


def serialize_project(project: Project) -> dict:
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
        "stakeholders": project.stakeholders or [],
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
    project.stakeholders = payload.stakeholders

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
    for activity_payload in payload.recentActivity:
        activity = Activity(
            id=activity_payload.id or generate_id("activity"),
            date=activity_payload.date,
            note=activity_payload.note,
            author=activity_payload.author,
        )
        project.recentActivity.append(activity)

    session.add(project)
    session.commit()
    session.refresh(project)
    session.exec(select(Project).options(selectinload(Project.plan).selectinload(Task.subtasks))).all()
    session.exec(select(Project).options(selectinload(Project.recentActivity))).all()
    return project


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


@app.get("/projects")
def list_projects(session: Session = Depends(get_session)):
    statement = select(Project).options(
        selectinload(Project.plan).selectinload(Task.subtasks),
        selectinload(Project.recentActivity),
    )
    projects = session.exec(statement).all()
    return [serialize_project(project) for project in projects]


@app.post("/projects", status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectPayload, session: Session = Depends(get_session)):
    project = upsert_project(session, payload)
    return serialize_project(project)


@app.get("/projects/{project_id}")
def get_project(project_id: str, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    return serialize_project(project)


@app.put("/projects/{project_id}")
def update_project(project_id: str, payload: ProjectPayload, session: Session = Depends(get_session)):
    if payload.id and payload.id != project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project ID mismatch")
    payload.id = project_id
    project = upsert_project(session, payload)
    return serialize_project(project)


@app.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    session.delete(project)
    session.commit()
    return None


@app.post("/projects/{project_id}/tasks")
def create_task(project_id: str, payload: TaskPayload, session: Session = Depends(get_session)):
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
    return serialize_project(load_project(session, project_id))


@app.put("/projects/{project_id}/tasks/{task_id}")
def update_task(project_id: str, task_id: str, payload: TaskPayload, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    task = session.exec(select(Task).where(Task.id == task_id, Task.project_id == project.id)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    apply_task_payload(task, payload)
    session.add(task)
    session.commit()
    return serialize_project(load_project(session, project_id))


@app.delete("/projects/{project_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_task(project_id: str, task_id: str, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    task = session.exec(select(Task).where(Task.id == task_id, Task.project_id == project.id)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    session.delete(task)
    session.commit()
    return None


@app.post("/projects/{project_id}/tasks/{task_id}/subtasks")
def create_subtask(project_id: str, task_id: str, payload: SubtaskPayload, session: Session = Depends(get_session)):
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
    return serialize_project(load_project(session, project_id))


@app.put("/projects/{project_id}/tasks/{task_id}/subtasks/{subtask_id}")
def update_subtask(project_id: str, task_id: str, subtask_id: str, payload: SubtaskPayload, session: Session = Depends(get_session)):
    load_project(session, project_id)
    subtask = session.exec(select(Subtask).where(Subtask.id == subtask_id, Subtask.task_id == task_id)).first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    subtask.title = payload.title
    subtask.status = payload.status
    subtask.dueDate = payload.dueDate
    subtask.completedDate = payload.completedDate
    session.add(subtask)
    session.commit()
    return serialize_project(load_project(session, project_id))


@app.delete("/projects/{project_id}/tasks/{task_id}/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subtask(project_id: str, task_id: str, subtask_id: str, session: Session = Depends(get_session)):
    load_project(session, project_id)
    subtask = session.exec(select(Subtask).where(Subtask.id == subtask_id, Subtask.task_id == task_id)).first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")
    session.delete(subtask)
    session.commit()
    return None


@app.post("/projects/{project_id}/activities")
def create_activity(project_id: str, payload: ActivityPayload, session: Session = Depends(get_session)):
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
    return serialize_project(load_project(session, project_id))


@app.put("/projects/{project_id}/activities/{activity_id}")
def update_activity(project_id: str, activity_id: str, payload: ActivityPayload, session: Session = Depends(get_session)):
    load_project(session, project_id)
    activity = session.exec(select(Activity).where(Activity.id == activity_id, Activity.project_id == project_id)).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    activity.note = payload.note
    activity.date = payload.date
    activity.author = payload.author
    session.add(activity)
    session.commit()
    return serialize_project(load_project(session, project_id))


@app.delete("/projects/{project_id}/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(project_id: str, activity_id: str, session: Session = Depends(get_session)):
    load_project(session, project_id)
    activity = session.exec(select(Activity).where(Activity.id == activity_id, Activity.project_id == project_id)).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    session.delete(activity)
    session.commit()
    return None


@app.get("/export")
def export_portfolio(project_id: Optional[str] = None, session: Session = Depends(get_session)):
    projects = []
    if project_id:
        projects.append(serialize_project(load_project(session, project_id)))
    else:
        projects = list_projects(session)

    def iter_payload():
        yield "{\n"
        yield f"  \"version\": 1,\n"
        yield f"  \"exportedAt\": \"{datetime.utcnow().isoformat()}\",\n"
        yield "  \"projects\": "
        import json
        yield json.dumps(projects, indent=2)
        yield "\n}"

    return StreamingResponse(iter_payload(), media_type="application/json")


@app.post("/import")
def import_portfolio(
    payload: ImportPayload | None = Body(None),
    file: UploadFile | None = File(None),
    mode: str = "replace",
    session: Session = Depends(get_session),
):
    if payload is None:
        if file is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No import payload provided")
        try:
            import json

            data = json.loads(file.file.read())
            if "mode" not in data:
                data["mode"] = mode
            payload = ImportPayload(**data)
        except Exception as exc:  # pragma: no cover - defensive
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid import file: {exc}")

    if payload.mode not in {"replace", "merge"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid import mode")

    existing_projects = {project.id: project for project in session.exec(select(Project)).all()}

    if payload.mode == "replace":
        session.exec(delete(Subtask))
        session.exec(delete(Task))
        session.exec(delete(Activity))
        session.exec(delete(Project))
        session.commit()
        existing_projects = {}

    for project_payload in payload.projects:
        if payload.mode == "merge" and project_payload.id in existing_projects:
            session.delete(existing_projects[project_payload.id])
            session.commit()
        upsert_project(session, project_payload)

    projects = list_projects(session)
    return {"projects": projects}


@app.post("/api/llm/chat")
async def proxy_llm_chat(payload: ChatRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured on server",
        )

    request_body = {
        "model": payload.model,
        "messages": [message.model_dump() for message in payload.messages],
    }

    if payload.response_format is not None:
        request_body["response_format"] = payload.response_format

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json=request_body,
            )
    except httpx.HTTPError as exc:  # pragma: no cover - network safeguard
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Upstream request failed: {exc}",
        ) from exc

    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.text,
        )

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return {"content": content, "raw": data}


@app.get("/")
def root():
    return {"status": "ok"}
