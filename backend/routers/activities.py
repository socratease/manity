import json as json_module

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from backend.main import (
    Activity,
    ActivityPayload,
    generate_id,
    get_session,
    load_project,
    log_action,
    normalize_project_activity,
    resolve_person_reference,
    serialize_project_with_people,
)

router = APIRouter(prefix="/projects", tags=["activities"])


@router.post("/{project_id}/activities")
def create_activity(project_id: str, payload: ActivityPayload, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)

    # Serialize taskContext to JSON string if present
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
def update_activity(project_id: str, activity_id: str, payload: ActivityPayload, request: Request, session: Session = Depends(get_session)):
    load_project(session, project_id)
    activity = session.exec(select(Activity).where(Activity.id == activity_id, Activity.project_id == project_id)).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    author_person = resolve_person_reference(session, payload.author_id or payload.author)
    activity.note = payload.note
    activity.date = payload.date
    # Update taskContext if provided
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
def delete_activity(project_id: str, activity_id: str, request: Request, session: Session = Depends(get_session)):
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
