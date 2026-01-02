from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from backend.main import (
    Activity,
    Project,
    ProjectPayload,
    Task,
    Subtask,
    add_data_change_activity,
    build_person_index,
    get_session,
    load_project,
    log_action,
    serialize_project,
    serialize_project_with_people,
    upsert_project,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects(session: Session = Depends(get_session)):
    person_index = build_person_index(session)
    statement = select(Project).options(
        selectinload(Project.plan).selectinload(Task.subtasks),
        selectinload(Project.plan).selectinload(Task.assignee),
        selectinload(Project.plan).selectinload(Task.subtasks).selectinload(Subtask.assignee),
        selectinload(Project.recentActivity),
        selectinload(Project.recentActivity).selectinload(Activity.author_person),
        selectinload(Project.stakeholders),
    )
    projects = session.exec(statement).all()
    return [serialize_project(project, person_index) for project in projects]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectPayload, request: Request, session: Session = Depends(get_session)):
    project = upsert_project(session, payload)
    log_action(session, "create_project", "project", project.id, {"name": project.name, "status": project.status}, request)
    return serialize_project_with_people(session, project)


@router.get("/{project_id}")
def get_project(project_id: str, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    return serialize_project_with_people(session, project)


@router.put("/{project_id}")
def update_project(project_id: str, payload: ProjectPayload, request: Request, session: Session = Depends(get_session)):
    if payload.id and payload.id != project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project ID mismatch")

    # Get existing project to track changes
    existing = session.exec(select(Project).where(Project.id == project_id)).first()
    old_values = {}
    if existing:
        old_values = {
            "name": existing.name,
            "status": existing.status,
            "priority": existing.priority,
            "progress": existing.progress,
            "description": existing.description,
            "executiveUpdate": existing.executiveUpdate,
            "startDate": existing.startDate,
            "targetDate": existing.targetDate,
        }

    payload.id = project_id
    project = upsert_project(session, payload)

    # Build activity description with specific changes
    changes = []
    if old_values:
        if old_values["name"] != project.name:
            changes.append(f"name to: {project.name}")
        if old_values["status"] != project.status:
            changes.append(f"status to: {project.status}")
        if old_values["priority"] != project.priority:
            changes.append(f"priority to: {project.priority}")
        if old_values["progress"] != project.progress:
            changes.append(f"progress to: {project.progress}%")
        if old_values["description"] != project.description:
            changes.append(f"description to: {project.description[:100]}{'...' if len(project.description or '') > 100 else ''}")
        if old_values["executiveUpdate"] != project.executiveUpdate:
            changes.append(f"executive update to: {(project.executiveUpdate or '')[:100]}{'...' if len(project.executiveUpdate or '') > 100 else ''}")
        if old_values["startDate"] != project.startDate:
            changes.append(f"start date to: {project.startDate or 'none'}")
        if old_values["targetDate"] != project.targetDate:
            changes.append(f"target date to: {project.targetDate or 'none'}")

        if changes:
            add_data_change_activity(
                session, project_id, request,
                f"Updated project: {', '.join(changes)}"
            )

    log_action(session, "update_project", "project", project_id, {"name": project.name, "status": project.status}, request)
    return serialize_project_with_people(session, project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    deleted_data = {"name": project.name}
    session.delete(project)
    session.commit()
    log_action(session, "delete_project", "project", project_id, deleted_data, request)
    return None
