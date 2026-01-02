from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from typing import List

from ..models.models import Project, Task, Subtask, Activity, Person
from ..schemas.schemas import ProjectPayload, TaskPayload, SubtaskPayload, ActivityPayload
from ..services.person_service import (
    resolve_person_reference,
    build_person_index,
    normalize_project_stakeholders,
    upsert_person_from_details,
    generate_id
)
from ..database import get_session
from ..utils import log_action, add_data_change_activity

router = APIRouter(prefix="/projects", tags=["projects"])

def serialize_person(person):
    if person is None:
        return None
    return {
        "id": person.id,
        "name": person.name,
        "team": person.team,
        "email": person.email,
    }

def serialize_subtask(subtask):
    return {
        "id": subtask.id,
        "title": subtask.title,
        "status": subtask.status,
        "dueDate": subtask.dueDate,
        "completedDate": subtask.completedDate,
        "assigneeId": subtask.assignee_id,
        "assignee": serialize_person(subtask.assignee),
    }

def serialize_task(task):
    return {
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "dueDate": task.dueDate,
        "completedDate": task.completedDate,
        "assigneeId": task.assignee_id,
        "assignee": serialize_person(task.assignee),
        "subtasks": [serialize_subtask(st) for st in task.subtasks],
    }

def serialize_activity(activity, person_index=None):
    import json
    task_context = None
    if activity.task_context:
        try:
            task_context = json.loads(activity.task_context)
        except (json.JSONDecodeError, TypeError):
            task_context = None

    resolved_person = None
    if activity.author_person:
        resolved_person = activity.author_person
    elif person_index:
        resolved_person = person_index.resolve(
            person_id=activity.author_id,
            name=activity.author,
        )

    return {
        "id": activity.id,
        "date": activity.date,
        "note": activity.note,
        "taskContext": task_context,
        "author": (resolved_person.name if resolved_person else None) or activity.author,
        "authorId": resolved_person.id if resolved_person else activity.author_id,
        "authorPerson": serialize_person(resolved_person),
    }

def normalize_project_activity(project):
    if project.recentActivity is None:
        project.recentActivity = []

    for activity in project.recentActivity:
        if not activity.author and activity.author_person:
            activity.author = activity.author_person.name

    project.recentActivity.sort(key=lambda a: a.date or "", reverse=True)

    if project.recentActivity:
        project.lastUpdate = project.recentActivity[0].note

    return project

def serialize_project(project, person_index=None):
    normalize_project_activity(project)

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
        "stakeholders": [serialize_person(person) for person in project.stakeholders],
        "plan": [serialize_task(task) for task in project.plan],
        "recentActivity": [serialize_activity(activity, person_index) for activity in project.recentActivity],
    }

def serialize_project_with_people(session, project):
    person_index = build_person_index(session)
    return serialize_project(project, person_index)

def apply_task_payload(task, payload, session=None):
    task.title = payload.title
    task.status = payload.status
    task.dueDate = payload.dueDate
    task.completedDate = payload.completedDate

    if session is not None:
        if hasattr(payload, "assignee") and payload.assignee is None:
            task.assignee = None
            task.assignee_id = None
        else:
            ref = None
            if hasattr(payload, "assignee") and payload.assignee:
                ref = payload.assignee
            elif hasattr(payload, "assignee_id") and payload.assignee_id:
                ref = payload.assignee_id

            if ref is not None:
                assignee = resolve_person_reference(session, ref)
                task.assignee = assignee
                task.assignee_id = assignee.id if assignee else None

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
            assignee_id=subtask_payload.assignee_id,
        )

        if session is not None:
            if hasattr(subtask_payload, "assignee") and subtask_payload.assignee is None:
                subtask.assignee = None
                subtask.assignee_id = None
            else:
                ref = None
                if hasattr(subtask_payload, "assignee") and subtask_payload.assignee:
                    ref = subtask_payload.assignee
                elif hasattr(subtask_payload, "assignee_id") and subtask_payload.assignee_id:
                    ref = subtask_payload.assignee_id

                if ref is not None:
                    assignee = resolve_person_reference(session, ref)
                    subtask.assignee = assignee
                    subtask.assignee_id = assignee.id if assignee else None

        task.subtasks.append(subtask)

    return task

def upsert_project(session, payload):
    normalized_name = (payload.name or "").strip()

    statement = (
        select(Project)
        .where(Project.id == payload.id)
        .options(
            selectinload(Project.stakeholders),
            selectinload(Project.plan).selectinload(Task.subtasks),
            selectinload(Project.plan).selectinload(Task.assignee),
            selectinload(Project.recentActivity).selectinload(Activity.author_person),
        )
    )
    project = session.exec(statement).first() if payload.id else None
    if project is None:
        project = Project(id=payload.id or generate_id("project"))

    existing_project = session.exec(
        select(Project).where(
            func.lower(Project.name) == func.lower(normalized_name),
            Project.id != (project.id if project else "")
        )
    ).first()
    if existing_project:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A project with the name '{normalized_name}' already exists. Please choose a different name."
        )

    project.name = normalized_name
    project.status = payload.status
    project.priority = payload.priority
    project.progress = payload.progress
    project.lastUpdate = payload.lastUpdate
    project.description = payload.description
    project.executiveUpdate = payload.executiveUpdate
    project.startDate = payload.startDate
    project.targetDate = payload.targetDate
    project.stakeholders_legacy = []

    if project.stakeholders is None:
        project.stakeholders = []
    else:
        project.stakeholders.clear()
    seen_stakeholders = set()
    for stakeholder_payload in payload.stakeholders:
        person = resolve_person_reference(session, stakeholder_payload)
        if person and person.id not in seen_stakeholders:
            project.stakeholders.append(person)
            seen_stakeholders.add(person.id)

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
            assignee_id=task_payload.assignee_id,
        )
        apply_task_payload(task, task_payload, session)
        project.plan.append(task)

    if project.recentActivity is None:
        project.recentActivity = []
    else:
        project.recentActivity.clear()
    activity_payloads = sorted(
        payload.recentActivity,
        key=lambda activity: activity.date or "",
    )

    import json as json_module
    for activity_payload in activity_payloads:
        task_context_str = None
        if activity_payload.taskContext is not None:
            task_context_str = json_module.dumps({
                "taskId": activity_payload.taskContext.taskId,
                "subtaskId": activity_payload.taskContext.subtaskId,
                "taskTitle": activity_payload.taskContext.taskTitle,
                "subtaskTitle": activity_payload.taskContext.subtaskTitle,
            })
        author_person = resolve_person_reference(session, activity_payload.author_id or activity_payload.author)
        author_name = (author_person.name if author_person else None) or activity_payload.author
        activity = Activity(
            id=activity_payload.id or generate_id("activity"),
            date=activity_payload.date,
            note=activity_payload.note,
            task_context=task_context_str,
            author=author_name,
            author_id=author_person.id if author_person else activity_payload.author_id,
        )
        project.recentActivity.append(activity)

    normalize_project_activity(project)

    session.add(project)
    session.commit()
    return load_project(session, project.id)

def load_project(session, project_id):
    statement = (
        select(Project)
        .where(Project.id == project_id)
        .options(
            selectinload(Project.plan).selectinload(Task.subtasks),
            selectinload(Project.plan).selectinload(Task.assignee),
            selectinload(Project.plan).selectinload(Task.subtasks).selectinload(Subtask.assignee),
            selectinload(Project.recentActivity),
            selectinload(Project.recentActivity).selectinload(Activity.author_person),
            selectinload(Project.stakeholders),
        )
    )
    project = session.exec(statement).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project

@router.get("")
def list_projects_endpoint(session: Session = Depends(get_session)):
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
def create_project_endpoint(payload: ProjectPayload, request: Request, session: Session = Depends(get_session)):
    project = upsert_project(session, payload)
    log_action(session, "create_project", "project", project.id, {"name": project.name, "status": project.status}, request)
    return serialize_project_with_people(session, project)

@router.get("/{project_id}")
def get_project_endpoint(project_id: str, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    return serialize_project_with_people(session, project)

@router.put("/{project_id}")
def update_project_endpoint(project_id: str, payload: ProjectPayload, request: Request, session: Session = Depends(get_session)):
    if payload.id and payload.id != project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project ID mismatch")

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
def delete_project_endpoint(project_id: str, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    deleted_data = {"name": project.name}
    session.delete(project)
    session.commit()
    log_action(session, "delete_project", "project", project_id, deleted_data, request)
    return None

@router.post("/{project_id}/tasks")
def create_task_endpoint(project_id: str, payload: TaskPayload, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    task = Task(
        id=payload.id or generate_id("task"),
        title=payload.title,
        status=payload.status,
        dueDate=payload.dueDate,
        completedDate=payload.completedDate,
        project_id=project.id,
        assignee_id=payload.assignee_id,
    )
    apply_task_payload(task, payload, session)
    session.add(task)
    session.commit()
    session.refresh(task)

    assignee_name = None
    if task.assignee_id:
        assignee = session.exec(select(Person).where(Person.id == task.assignee_id)).first()
        assignee_name = assignee.name if assignee else None
    add_data_change_activity(
        session, project_id, request,
        f"Created task: {task.title}" + (f" (assigned to {assignee_name})" if assignee_name else "")
    )

    log_action(session, "create_task", "task", task.id, {"project_id": project_id, "title": task.title}, request)
    return serialize_project_with_people(session, load_project(session, project_id))

@router.put("/{project_id}/tasks/{task_id}")
def update_task_endpoint(project_id: str, task_id: str, payload: TaskPayload, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    task = session.exec(select(Task).where(Task.id == task_id, Task.project_id == project.id)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    changes = []
    old_status = task.status
    old_title = task.title
    old_due_date = task.dueDate
    old_assignee_id = task.assignee_id
    apply_task_payload(task, payload, session)
    session.add(task)
    session.commit()

    if old_title != task.title:
        changes.append(f"title to: {task.title}")
    if old_status != task.status:
        changes.append(f"status from {old_status} to {task.status}")
    if old_due_date != task.dueDate:
        changes.append(f"due date to: {task.dueDate or 'none'}")
    if old_assignee_id != task.assignee_id:
        if task.assignee_id:
            new_assignee = session.exec(select(Person).where(Person.id == task.assignee_id)).first()
            changes.append(f"assigned to {new_assignee.name if new_assignee else 'unknown'}")
        else:
            changes.append("unassigned")

    if changes:
        add_data_change_activity(
            session, project_id, request,
            f"Updated task '{task.title}': {', '.join(changes)}"
        )

    log_action(session, "update_task", "task", task_id, {"project_id": project_id, "title": task.title, "old_status": old_status, "new_status": task.status}, request)
    return serialize_project_with_people(session, load_project(session, project_id))

@router.delete("/{project_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_task_endpoint(project_id: str, task_id: str, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    task = session.exec(select(Task).where(Task.id == task_id, Task.project_id == project.id)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    deleted_data = {"project_id": project_id, "title": task.title}
    task_title = task.title
    session.delete(task)
    session.commit()

    add_data_change_activity(session, project_id, request, f"Deleted task: {task_title}")

    log_action(session, "delete_task", "task", task_id, deleted_data, request)
    return None

@router.post("/{project_id}/tasks/{task_id}/subtasks")
def create_subtask_endpoint(project_id: str, task_id: str, payload: SubtaskPayload, request: Request, session: Session = Depends(get_session)):
    load_project(session, project_id)
    task = session.exec(select(Task).where(Task.id == task_id, Task.project_id == project_id)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    assignee = resolve_person_reference(session, payload.assignee or payload.assignee_id)
    subtask = Subtask(
        id=payload.id or generate_id("subtask"),
        title=payload.title,
        status=payload.status,
        dueDate=payload.dueDate,
        completedDate=payload.completedDate,
        task_id=task.id,
        assignee_id=assignee.id if assignee else payload.assignee_id,
    )
    if assignee:
        subtask.assignee = assignee
    session.add(subtask)
    session.commit()

    assignee_name = None
    if subtask.assignee_id:
        assignee = session.exec(select(Person).where(Person.id == subtask.assignee_id)).first()
        assignee_name = assignee.name if assignee else None
    add_data_change_activity(
        session, project_id, request,
        f"Created subtask '{subtask.title}' in task '{task.title}'" + (f" (assigned to {assignee_name})" if assignee_name else "")
    )

    log_action(session, "create_subtask", "subtask", subtask.id, {"project_id": project_id, "task_id": task_id, "title": subtask.title}, request)
    return serialize_project_with_people(session, load_project(session, project_id))

@router.put("/{project_id}/tasks/{task_id}/subtasks/{subtask_id}")
def update_subtask_endpoint(project_id: str, task_id: str, subtask_id: str, payload: SubtaskPayload, request: Request, session: Session = Depends(get_session)):
    load_project(session, project_id)
    subtask = session.exec(select(Subtask).where(Subtask.id == subtask_id, Subtask.task_id == task_id)).first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")

    task = session.exec(select(Task).where(Task.id == task_id)).first()
    task_title = task.title if task else "Unknown Task"

    changes = []
    old_status = subtask.status
    old_title = subtask.title
    old_due_date = subtask.dueDate
    old_assignee_id = subtask.assignee_id
    assignee = resolve_person_reference(session, payload.assignee or payload.assignee_id)
    subtask.title = payload.title
    subtask.status = payload.status
    subtask.dueDate = payload.dueDate
    subtask.completedDate = payload.completedDate

    if hasattr(payload, "assignee") and payload.assignee is None:
        subtask.assignee = None
        subtask.assignee_id = None
    else:
        subtask.assignee = assignee
        subtask.assignee_id = assignee.id if assignee else payload.assignee_id

    session.add(subtask)
    session.commit()

    if old_title != subtask.title:
        changes.append(f"title to: {subtask.title}")
    if old_status != subtask.status:
        changes.append(f"status from {old_status} to {subtask.status}")
    if old_due_date != subtask.dueDate:
        changes.append(f"due date to: {subtask.dueDate or 'none'}")
    if old_assignee_id != subtask.assignee_id:
        if subtask.assignee_id:
            new_assignee = session.exec(select(Person).where(Person.id == subtask.assignee_id)).first()
            changes.append(f"assigned to {new_assignee.name if new_assignee else 'unknown'}")
        else:
            changes.append("unassigned")

    if changes:
        add_data_change_activity(
            session, project_id, request,
            f"Updated subtask '{subtask.title}' in task '{task_title}': {', '.join(changes)}"
        )

    log_action(session, "update_subtask", "subtask", subtask_id, {"project_id": project_id, "task_id": task_id, "title": subtask.title, "old_status": old_status, "new_status": subtask.status}, request)
    return serialize_project_with_people(session, load_project(session, project_id))

@router.delete("/{project_id}/tasks/{task_id}/subtasks/{subtask_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subtask_endpoint(project_id: str, task_id: str, subtask_id: str, request: Request, session: Session = Depends(get_session)):
    load_project(session, project_id)
    subtask = session.exec(select(Subtask).where(Subtask.id == subtask_id, Subtask.task_id == task_id)).first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")

    task = session.exec(select(Task).where(Task.id == task_id)).first()
    task_title = task.title if task else "Unknown Task"

    deleted_data = {"project_id": project_id, "task_id": task_id, "title": subtask.title}
    subtask_title = subtask.title
    session.delete(subtask)
    session.commit()

    add_data_change_activity(session, project_id, request, f"Deleted subtask '{subtask_title}' from task '{task_title}'")

    log_action(session, "delete_subtask", "subtask", subtask_id, deleted_data, request)
    return None

@router.post("/{project_id}/activities")
def create_activity_endpoint(project_id: str, payload: ActivityPayload, request: Request, session: Session = Depends(get_session)):
    import json as json_module
    project = load_project(session, project_id)

    task_context_str = None
    if payload.taskContext is not None:
        task_context_str = json_module.dumps({
            "taskId": payload.taskContext.taskId,
            "subtaskId": payload.taskContext.subtaskId,
            "taskTitle": payload.taskContext.taskTitle,
            "subtaskTitle": payload.taskContext.subtaskTitle,
        })

    author_person = resolve_person_reference(session, payload.author_id or payload.author)
    author_name = (author_person.name if author_person else None) or payload.author or "Unknown"
    activity = Activity(
        id=payload.id or generate_id("activity"),
        date=payload.date,
        note=payload.note,
        author=author_name,
        author_id=author_person.id if author_person else payload.author_id,
        project_id=project.id,
        task_context=task_context_str,
    )
    session.add(activity)
    session.commit()
    project = load_project(session, project_id)
    normalize_project_activity(project)
    session.add(project)
    session.commit()
    log_action(session, "create_activity", "activity", activity.id, {"project_id": project_id, "author": activity.author, "note_preview": activity.note[:100] if activity.note else None}, request)
    return serialize_project_with_people(session, load_project(session, project_id))

@router.put("/{project_id}/activities/{activity_id}")
def update_activity_endpoint(project_id: str, activity_id: str, payload: ActivityPayload, request: Request, session: Session = Depends(get_session)):
    import json as json_module
    load_project(session, project_id)
    activity = session.exec(select(Activity).where(Activity.id == activity_id, Activity.project_id == project_id)).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    author_person = resolve_person_reference(session, payload.author_id or payload.author)
    activity.note = payload.note
    activity.date = payload.date

    fields_set = getattr(payload, "model_fields_set", None) or getattr(payload, "__fields_set__", set())
    if payload.taskContext is not None:
        activity.task_context = json_module.dumps({
            "taskId": payload.taskContext.taskId,
            "subtaskId": payload.taskContext.subtaskId,
            "taskTitle": payload.taskContext.taskTitle,
            "subtaskTitle": payload.taskContext.subtaskTitle,
        })
    elif "taskContext" in fields_set:
        activity.task_context = None
    activity.author = (author_person.name if author_person else None) or payload.author or "Unknown"
    activity.author_id = author_person.id if author_person else payload.author_id
    session.add(activity)
    session.commit()
    project = load_project(session, project_id)
    normalize_project_activity(project)
    session.add(project)
    session.commit()
    log_action(session, "update_activity", "activity", activity_id, {"project_id": project_id, "author": activity.author}, request)
    return serialize_project_with_people(session, load_project(session, project_id))

@router.delete("/{project_id}/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity_endpoint(project_id: str, activity_id: str, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    activity = session.exec(select(Activity).where(Activity.id == activity_id, Activity.project_id == project_id)).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    deleted_data = {"project_id": project_id, "author": activity.author}
    session.delete(activity)
    session.commit()
    project = load_project(session, project_id)
    normalize_project_activity(project)
    session.add(project)
    session.commit()
    log_action(session, "delete_activity", "activity", activity_id, deleted_data, request)
    return None
