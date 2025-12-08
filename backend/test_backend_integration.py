import json
from contextlib import contextmanager
from pathlib import Path

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, select

import backend.main as main


@contextmanager
def create_isolated_client(db_path: Path):
    """Create a TestClient bound to a temporary SQLite database."""

    main.engine = main.create_engine_from_env(f"sqlite:///{db_path}")
    SQLModel.metadata.create_all(main.engine)

    original_startup = list(main.app.router.on_startup)
    original_overrides = dict(main.app.dependency_overrides)

    def override_get_session():
        with Session(main.engine) as session:
            yield session

    main.app.router.on_startup = []
    main.app.dependency_overrides[main.get_session] = override_get_session

    try:
        with TestClient(main.app) as client:
            yield client
    finally:
        main.app.router.on_startup = original_startup
        main.app.dependency_overrides = original_overrides


def test_crud_and_persistence(tmp_path):
    db_path = tmp_path / "crud.db"

    with create_isolated_client(db_path) as client:
        assert client.get("/projects").json() == []

        project_payload = {
            "name": "Integration Project",
            "status": "active",
            "priority": "high",
            "progress": 5,
            "description": "Initial description",
            "plan": [],
            "recentActivity": [],
            "stakeholders": [],
            "lastUpdate": None,
            "executiveUpdate": None,
            "startDate": None,
            "targetDate": None,
        }

        project = client.post("/projects", json=project_payload).json()
        project_id = project["id"]

        updated_project = {
            **project_payload,
            "id": project_id,
            "progress": 25,
            "description": "Updated after kickoff",
        }
        project = client.put(f"/projects/{project_id}", json=updated_project).json()
        assert project["progress"] == 25

        task_payload = {
            "title": "Outline milestones",
            "status": "todo",
            "subtasks": [],
            "dueDate": "2025-12-01",
            "completedDate": None,
        }
        project = client.post(f"/projects/{project_id}/tasks", json=task_payload).json()
        task_id = project["plan"][0]["id"]

        updated_task = {**task_payload, "id": task_id, "status": "in-progress"}
        project = client.put(
            f"/projects/{project_id}/tasks/{task_id}", json=updated_task
        ).json()
        assert project["plan"][0]["status"] == "in-progress"

        subtask_one = {"title": "Collect requirements", "status": "todo", "dueDate": None, "completedDate": None}
        project = client.post(
            f"/projects/{project_id}/tasks/{task_id}/subtasks", json=subtask_one
        ).json()
        subtask_one_id = project["plan"][0]["subtasks"][0]["id"]

        subtask_two = {
            "title": "Draft proposal",
            "status": "in-progress",
            "dueDate": None,
            "completedDate": None,
        }
        project = client.post(
            f"/projects/{project_id}/tasks/{task_id}/subtasks", json=subtask_two
        ).json()
        subtask_two_id = project["plan"][0]["subtasks"][1]["id"]

        updated_subtask_two = {
            **subtask_two,
            "id": subtask_two_id,
            "status": "completed",
            "completedDate": "2025-12-02",
        }
        project = client.put(
            f"/projects/{project_id}/tasks/{task_id}/subtasks/{subtask_two_id}",
            json=updated_subtask_two,
        ).json()
        assert project["plan"][0]["subtasks"][1]["status"] == "completed"

        delete_response = client.delete(
            f"/projects/{project_id}/tasks/{task_id}/subtasks/{subtask_one_id}"
        )
        assert delete_response.status_code == 204

        activity_one = {"date": "2025-12-01", "note": "Kickoff", "author": "Alex"}
        project = client.post(
            f"/projects/{project_id}/activities", json=activity_one
        ).json()
        activity_one_id = project["recentActivity"][0]["id"]

        updated_activity = {**activity_one, "id": activity_one_id, "note": "Kickoff complete"}
        project = client.put(
            f"/projects/{project_id}/activities/{activity_one_id}",
            json=updated_activity,
        ).json()
        assert project["recentActivity"][0]["note"] == "Kickoff complete"

        activity_two = {"date": "2025-12-03", "note": "Draft shared", "author": "Jamie"}
        project = client.post(
            f"/projects/{project_id}/activities", json=activity_two
        ).json()
        activity_two_id = project["recentActivity"][1]["id"]

        delete_activity = client.delete(
            f"/projects/{project_id}/activities/{activity_two_id}"
        )
        assert delete_activity.status_code == 204

        project = client.get(f"/projects/{project_id}").json()
        assert project["plan"][0]["subtasks"][0]["status"] == "completed"
        assert len(project["recentActivity"]) == 1

    restarted_engine = main.create_engine_from_env(f"sqlite:///{db_path}")
    with Session(restarted_engine) as session:
        projects = session.exec(select(main.Project)).all()
        tasks = session.exec(select(main.Task)).all()
        subtasks = session.exec(select(main.Subtask)).all()
        activities = session.exec(select(main.Activity)).all()

        assert len(projects) == 1
        assert len(tasks) == 1
        assert len(subtasks) == 1
        assert len(activities) == 1

    with create_isolated_client(db_path) as restarted_client:
        persisted = restarted_client.get("/projects").json()
        assert len(persisted) == 1
        assert persisted[0]["plan"][0]["subtasks"][0]["title"] == "Draft proposal"
        assert persisted[0]["recentActivity"][0]["note"] == "Kickoff complete"


def test_export_and_import_round_trip(tmp_path):
    source_db = tmp_path / "source.db"

    with create_isolated_client(source_db) as client:
        payload = {
            "name": "Portfolio",
            "status": "active",
            "priority": "medium",
            "progress": 10,
            "description": "Export me",
            "plan": [
                {
                    "title": "Author tasks",
                    "status": "todo",
                    "subtasks": [],
                    "dueDate": None,
                    "completedDate": None,
                }
            ],
            "recentActivity": [
                {"date": "2025-11-30", "note": "Created", "author": "API"}
            ],
            "stakeholders": [],
            "lastUpdate": None,
            "executiveUpdate": None,
            "startDate": None,
            "targetDate": None,
        }

        export_project = client.post("/projects", json=payload).json()
        exported = client.get("/export")
        assert exported.status_code == 200

    export_payload = exported.json()
    assert export_payload["projects"][0]["id"] == export_project["id"]

    replace_db = tmp_path / "replace.db"
    with create_isolated_client(replace_db) as client:
        placeholder = client.post(
            "/projects",
            json={
                "name": "Placeholder",
                "status": "planning",
                "priority": "low",
                "progress": 0,
                "plan": [],
                "recentActivity": [],
                "stakeholders": [],
                "description": "temp",
                "lastUpdate": None,
                "executiveUpdate": None,
                "startDate": None,
                "targetDate": None,
            },
        )
        assert placeholder.status_code == 201

        replace_response = client.post(
            "/import?mode=replace", json=export_payload
        )
        assert replace_response.status_code == 200
        replaced_projects = client.get("/projects").json()
        assert {p["id"] for p in replaced_projects} == {export_project["id"]}

        extra_project = client.post(
            "/projects",
            json={
                "name": "Local only",
                "status": "active",
                "priority": "high",
                "progress": 50,
                "plan": [],
                "recentActivity": [],
                "stakeholders": [],
                "description": "should survive merge",
                "lastUpdate": None,
                "executiveUpdate": None,
                "startDate": None,
                "targetDate": None,
            },
        ).json()

    with create_isolated_client(replace_db) as client:
        merge_response = client.post("/import?mode=merge", json=export_payload)
        assert merge_response.status_code == 200
        merged_projects = client.get("/projects").json()
        merged_ids = {p["id"] for p in merged_projects}
        assert merged_ids == {export_project["id"], extra_project["id"]}

        merged_export = client.get("/export").json()
        assert len(merged_export["projects"]) == 2
