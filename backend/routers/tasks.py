from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from backend.main import (
    Person,
    Subtask,
    SubtaskPayload,
    Task,
    TaskPayload,
    add_data_change_activity,
    apply_task_payload,
    generate_id,
    get_session,
    load_project,
    log_action,
    resolve_person_reference,
    serialize_project_with_people,
)

router = APIRouter(prefix="/projects", tags=["tasks"])


@router.post("/{project_id}/tasks")
def create_task(project_id: str, payload: TaskPayload, request: Request, session: Session = Depends(get_session)):
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

    # Add activity for task creation
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
def update_task(project_id: str, task_id: str, payload: TaskPayload, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    task = session.exec(select(Task).where(Task.id == task_id, Task.project_id == project.id)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Track changes for activity feed
    changes = []
    old_status = task.status
    old_title = task.title
    old_due_date = task.dueDate
    old_assignee_id = task.assignee_id
    apply_task_payload(task, payload, session)
    session.add(task)
    session.commit()

    # Build activity description with specific changes
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
def remove_task(project_id: str, task_id: str, request: Request, session: Session = Depends(get_session)):
    project = load_project(session, project_id)
    task = session.exec(select(Task).where(Task.id == task_id, Task.project_id == project.id)).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    deleted_data = {"project_id": project_id, "title": task.title}
    task_title = task.title
    session.delete(task)
    session.commit()

    # Add activity for task deletion
    add_data_change_activity(session, project_id, request, f"Deleted task: {task_title}")

    log_action(session, "delete_task", "task", task_id, deleted_data, request)
    return None


@router.post("/{project_id}/tasks/{task_id}/subtasks")
def create_subtask(project_id: str, task_id: str, payload: SubtaskPayload, request: Request, session: Session = Depends(get_session)):
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

    # Add activity for subtask creation
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
def update_subtask(project_id: str, task_id: str, subtask_id: str, payload: SubtaskPayload, request: Request, session: Session = Depends(get_session)):
    load_project(session, project_id)
    subtask = session.exec(select(Subtask).where(Subtask.id == subtask_id, Subtask.task_id == task_id)).first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")

    # Get parent task for activity message
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    task_title = task.title if task else "Unknown Task"

    # Track changes for activity feed
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
    # If caller explicitly provides assignee=None, treat that as "clear", regardless of assignee_id.
    if hasattr(payload, "assignee") and payload.assignee is None:
        subtask.assignee = None
        subtask.assignee_id = None
    else:
        subtask.assignee = assignee
        subtask.assignee_id = assignee.id if assignee else payload.assignee_id

    session.add(subtask)
    session.commit()

    # Build activity description with specific changes
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
def delete_subtask(project_id: str, task_id: str, subtask_id: str, request: Request, session: Session = Depends(get_session)):
    load_project(session, project_id)
    subtask = session.exec(select(Subtask).where(Subtask.id == subtask_id, Subtask.task_id == task_id)).first()
    if not subtask:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subtask not found")

    # Get parent task for activity message
    task = session.exec(select(Task).where(Task.id == task_id)).first()
    task_title = task.title if task else "Unknown Task"

    deleted_data = {"project_id": project_id, "task_id": task_id, "title": subtask.title}
    subtask_title = subtask.title
    session.delete(subtask)
    session.commit()

    # Add activity for subtask deletion
    add_data_change_activity(session, project_id, request, f"Deleted subtask '{subtask_title}' from task '{task_title}'")

    log_action(session, "delete_subtask", "subtask", subtask_id, deleted_data, request)
    return None
