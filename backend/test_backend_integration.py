import json
from contextlib import contextmanager
from contextlib import contextmanager
from pathlib import Path

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, select

import backend.main as main


@contextmanager
def create_isolated_client(db_path: Path):
    """Create a TestClient bound to a temporary SQLite database."""

    main.engine = main.create_engine_from_env(f"sqlite:///{db_path}")
    main.create_db_and_tables()

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
        activity_two_id = next(
            activity["id"] for activity in project["recentActivity"] if activity["note"] == activity_two["note"]
        )

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


def test_email_settings_and_sending(tmp_path, monkeypatch):
    db_path = tmp_path / "email.db"
    sent_messages = []

    class FakeSMTP:
        def __init__(self, server, port, timeout=None):
            self.server = server
            self.port = port
            self.timeout = timeout
            self.started_tls = False
            self.logged_in = False

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def starttls(self):
            self.started_tls = True

        def login(self, username, password):
            self.logged_in = True
            self.username = username
            self.password = password

        def send_message(self, message):
            sent_messages.append({
                "to": message["To"],
                "from": message["From"],
                "subject": message["Subject"],
                "body": message.get_content(),
            })

    monkeypatch.setattr(main.smtplib, "SMTP", FakeSMTP)

    with create_isolated_client(db_path) as client:
        defaults = client.get("/settings/email").json()
        assert defaults["smtpServer"] == ""
        assert defaults["hasPassword"] is False

        updated = client.put(
            "/settings/email",
            json={
                "smtpServer": "smtp.example.com",
                "smtpPort": 2525,
                "username": "bot@example.com",
                "password": "secret",
                "useTLS": True,
                "fromAddress": "bot@example.com",
            },
        ).json()

        assert updated["smtpServer"] == "smtp.example.com"
        assert updated["smtpPort"] == 2525
        assert updated["hasPassword"] is True

        response = client.post(
            "/actions/email",
            json={
                "recipients": ["alex@example.com", "team@example.com"],
                "subject": "Status",
                "body": "Update ready",
            },
        )

        assert response.status_code == 202
        assert sent_messages
        message = sent_messages[0]
        assert message["to"] == "alex@example.com, team@example.com"
        assert message["from"] == "bot@example.com"
        assert message["subject"] == "Status"
        assert "Update ready" in message["body"]
