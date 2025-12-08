import json
import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, select

import backend.main as main


def _create_test_client(tmp_path):
    db_path = tmp_path / "test.db"
    main.engine = main.create_engine_from_env(f"sqlite:///{db_path}")
    SQLModel.metadata.create_all(main.engine)
    return TestClient(main.app)


def test_models_can_be_mapped_and_related(tmp_path):
    db_path = tmp_path / "test.db"
    main.engine = main.create_engine_from_env(f"sqlite:///{db_path}")

    # Ensure we start from a clean metadata state
    SQLModel.metadata.create_all(main.engine)

    with Session(main.engine) as session:
        project = main.Project(id="project-1", name="Test Project")
        task = main.Task(id="task-1", title="Test Task", project=project)
        subtask = main.Subtask(id="subtask-1", title="Test Subtask", task=task)
        activity = main.Activity(id="activity-1", date="2025-01-01", note="note", author="me", project=project)

        session.add(project)
        session.add(activity)
        session.commit()

        refreshed_project = session.get(main.Project, "project-1")
        assert refreshed_project is not None
        assert refreshed_project.plan[0].subtasks[0].title == "Test Subtask"
        assert refreshed_project.recentActivity[0].note == "note"


def test_stakeholders_are_normalized_to_json(tmp_path):
    db_path = tmp_path / "test.db"
    main.engine = main.create_engine_from_env(f"sqlite:///{db_path}")

    SQLModel.metadata.create_all(main.engine)

    payload = main.ProjectPayload(
        name="Stakeholder Project",
        status="active",
        priority="high",
        progress=10,
        stakeholders=[
            main.Stakeholder(name="Alice", team="Product"),
            main.Stakeholder(name="Bob", team="Engineering"),
        ],
    )

    with Session(main.engine) as session:
        project = main.upsert_project(session, payload)

        expected = [
            {"name": "Alice", "team": "Product"},
            {"name": "Bob", "team": "Engineering"},
        ]

        assert project.stakeholders == expected

        serialized = main.serialize_project(project)
        assert serialized["stakeholders"] == expected

        refreshed_project = session.get(main.Project, project.id)
        assert refreshed_project.stakeholders == expected


def test_upsert_project_loads_relationships(tmp_path):
    """Test that upsert_project properly loads all relationships (subtasks, activities)"""
    db_path = tmp_path / "test.db"
    main.engine = main.create_engine_from_env(f"sqlite:///{db_path}")

    SQLModel.metadata.create_all(main.engine)

    # Create a project with tasks, subtasks, and activities
    payload = main.ProjectPayload(
        name="Full Project",
        status="active",
        priority="high",
        progress=50,
        plan=[
            main.TaskPayload(
                title="Task 1",
                status="in-progress",
                subtasks=[
                    main.SubtaskPayload(title="Subtask 1.1", status="completed"),
                    main.SubtaskPayload(title="Subtask 1.2", status="in-progress"),
                ]
            ),
            main.TaskPayload(
                title="Task 2",
                status="todo",
                subtasks=[
                    main.SubtaskPayload(title="Subtask 2.1", status="todo"),
                ]
            ),
        ],
        recentActivity=[
            main.ActivityPayload(date="2025-01-01", note="Started project", author="Alice"),
            main.ActivityPayload(date="2025-01-02", note="Made progress", author="Bob"),
        ]
    )

    with Session(main.engine) as session:
        project = main.upsert_project(session, payload)

        # Verify that all relationships are loaded (not lazy-loaded)
        assert project.plan is not None
        assert len(project.plan) == 2
        assert project.plan[0].title == "Task 1"
        assert project.plan[1].title == "Task 2"

        # Verify subtasks are loaded
        assert project.plan[0].subtasks is not None
        assert len(project.plan[0].subtasks) == 2
        assert project.plan[0].subtasks[0].title == "Subtask 1.1"
        assert project.plan[0].subtasks[1].title == "Subtask 1.2"

        assert project.plan[1].subtasks is not None
        assert len(project.plan[1].subtasks) == 1
        assert project.plan[1].subtasks[0].title == "Subtask 2.1"

        # Verify activities are loaded
        assert project.recentActivity is not None
        assert len(project.recentActivity) == 2
        assert project.recentActivity[0].note == "Started project"
        assert project.recentActivity[1].note == "Made progress"

        # Verify serialization includes all relationships
        serialized = main.serialize_project(project)
        assert len(serialized["plan"]) == 2
        assert len(serialized["plan"][0]["subtasks"]) == 2
        assert len(serialized["plan"][1]["subtasks"]) == 1
        assert len(serialized["recentActivity"]) == 2


def test_import_portfolio_honors_query_mode_for_json_payload(tmp_path):
    client = _create_test_client(tmp_path)

    with Session(main.engine) as session:
        session.add(main.Project(id="existing", name="Existing Project"))
        session.commit()

    payload = {"projects": [{"id": "new-project", "name": "New Project"}]}
    response = client.post("/import?mode=merge", json=payload)

    assert response.status_code == 200

    with Session(main.engine) as session:
        project_ids = {project.id for project in session.exec(select(main.Project)).all()}
        assert project_ids == {"existing", "new-project"}


def test_import_portfolio_honors_query_mode_for_json_replace(tmp_path):
    client = _create_test_client(tmp_path)

    with Session(main.engine) as session:
        session.add(main.Project(id="existing", name="Existing Project"))
        session.commit()

    payload = {"projects": [{"id": "replacement", "name": "Replacement Project"}]}
    response = client.post("/import?mode=replace", json=payload)

    assert response.status_code == 200

    with Session(main.engine) as session:
        project_ids = {project.id for project in session.exec(select(main.Project)).all()}
        assert project_ids == {"replacement"}


def test_import_portfolio_honors_query_mode_for_file_merge(tmp_path):
    client = _create_test_client(tmp_path)

    with Session(main.engine) as session:
        session.add(main.Project(id="existing", name="Existing Project"))
        session.commit()

    file_content = json.dumps({"projects": [{"id": "merged", "name": "Merged Project"}]})
    response = client.post(
        "/import?mode=merge",
        files={"file": ("import.json", file_content, "application/json")},
    )

    assert response.status_code == 200

    with Session(main.engine) as session:
        project_ids = {project.id for project in session.exec(select(main.Project)).all()}
        assert project_ids == {"existing", "merged"}


def test_import_portfolio_honors_query_mode_for_file_replace(tmp_path):
    client = _create_test_client(tmp_path)

    with Session(main.engine) as session:
        session.add(main.Project(id="existing", name="Existing Project"))
        session.commit()

    file_content = json.dumps({"projects": [{"id": "replacement", "name": "Replacement Project"}]})
    response = client.post(
        "/import?mode=replace",
        files={"file": ("import.json", file_content, "application/json")},
    )

    assert response.status_code == 200

    with Session(main.engine) as session:
        project_ids = {project.id for project in session.exec(select(main.Project)).all()}
        assert project_ids == {"replacement"}
