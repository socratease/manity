import os
import tempfile

import pytest
from sqlmodel import Session, SQLModel, create_engine

import backend.main as main


def test_models_can_be_mapped_and_related(tmp_path):
    db_path = tmp_path / "test.db"
    main.engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})

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
    main.engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})

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
