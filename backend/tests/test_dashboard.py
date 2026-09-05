"""Tests for the dashboard metrics endpoint."""

from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core import security
from app.database import Base, get_db
from app.main import app
from app.models import Category, Priority, Role, Status, Ticket, User, utcnow

TEST_SECRET = "dashboard-test-secret-key-at-least-32-bytes-long"


@pytest.fixture()
def db_env(tmp_path, monkeypatch):
    monkeypatch.setattr(security, "_secret", lambda: TEST_SECRET)

    engine = create_engine(
        f"sqlite:///{tmp_path / 'dashboard_test.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client, session_factory
    app.dependency_overrides.clear()
    engine.dispose()


def _create_user(session, email: str, role: Role, name: str) -> User:
    user = User(
        email=email,
        display_name=name,
        password_hash="unused",
        role=role,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _create_ticket(
    session,
    creator_id: int,
    *,
    status: Status = Status.open,
    priority: Priority = Priority.low,
    due_at=None,
    updated_at=None,
) -> Ticket:
    ticket = Ticket(
        title="title",
        description="description",
        category=Category.hardware,
        priority=priority,
        status=status,
        creator_id=creator_id,
        due_at=due_at,
        updated_at=updated_at,
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


def _auth_headers(user_id: int) -> dict:
    token = security.create_access_token(str(user_id))
    return {"Authorization": f"Bearer {token}"}


def test_dashboard_requires_authentication(db_env):
    client, _ = db_env
    response = client.get("/api/dashboard")
    assert response.status_code == 401


def test_agent_sees_global_metrics_matching_database(db_env):
    client, session_factory = db_env
    session = session_factory()

    agent = _create_user(session, "agent@example.com", Role.agent, "Agent")
    reporter = _create_user(session, "reporter@example.com", Role.melder, "Reporter")

    now = utcnow()
    _create_ticket(session, reporter.id, priority=Priority.high, due_at=now + timedelta(days=1))
    _create_ticket(session, reporter.id, priority=Priority.high, due_at=now - timedelta(days=1))
    _create_ticket(
        session, reporter.id, status=Status.closed, priority=Priority.low, updated_at=now
    )
    _create_ticket(
        session,
        reporter.id,
        status=Status.closed,
        priority=Priority.medium,
        updated_at=now - timedelta(days=1),
    )
    _create_ticket(
        session,
        reporter.id,
        status=Status.resolved,
        priority=Priority.critical,
        due_at=now - timedelta(days=1),
    )

    response = client.get("/api/dashboard", headers=_auth_headers(agent.id))
    assert response.status_code == 200
    data = response.json()

    assert data["open"] == 3
    assert data["overdue"] == 2
    assert data["closed_today"] == 1
    assert data["priority_distribution"] == {
        "low": 1,
        "medium": 1,
        "high": 2,
        "critical": 1,
    }


def test_reporter_sees_only_own_tickets(db_env):
    client, session_factory = db_env
    session = session_factory()

    reporter_a = _create_user(session, "a@example.com", Role.melder, "Reporter A")
    reporter_b = _create_user(session, "b@example.com", Role.melder, "Reporter B")

    now = utcnow()
    _create_ticket(session, reporter_a.id, priority=Priority.high, due_at=now + timedelta(days=1))
    _create_ticket(session, reporter_a.id, priority=Priority.high, due_at=now - timedelta(days=1))
    _create_ticket(
        session, reporter_a.id, status=Status.closed, priority=Priority.low, updated_at=now
    )

    _create_ticket(session, reporter_b.id, priority=Priority.medium, due_at=now - timedelta(days=1))
    _create_ticket(
        session, reporter_b.id, status=Status.closed, priority=Priority.critical, updated_at=now
    )

    response = client.get("/api/dashboard", headers=_auth_headers(reporter_a.id))
    assert response.status_code == 200
    data = response.json()

    assert data["open"] == 2
    assert data["overdue"] == 1
    assert data["closed_today"] == 1
    assert data["priority_distribution"] == {"low": 1, "medium": 0, "high": 2, "critical": 0}
