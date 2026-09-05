"""Tests for the ticket detail router (detail, edit, close, reopen, assign, audit)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.database import Base, get_db
from app.main import app
from app.models import Category, Priority, Role, Status, Ticket, User


@pytest.fixture()
def engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture()
def session_factory(engine):
    return sessionmaker(bind=engine, autocommit=False, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def client(monkeypatch, engine, session_factory):
    monkeypatch.setattr(
        "app.core.security._secret", lambda: "test-secret-0123456789abcdef0123456789"
    )

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _make_user(
    session,
    email: str,
    display_name: str,
    role: Role = Role.melder,
    is_active: bool = True,
) -> User:
    user = User(
        email=email,
        display_name=display_name,
        password_hash=hash_password("password123"),
        role=role,
        is_active=is_active,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _make_ticket(
    session,
    creator_id: int,
    *,
    title: str = "Test Ticket",
    description: str = "Beschreibung",
    category: Category = Category.software,
    priority: Priority = Priority.medium,
    status: Status = Status.open,
    assignee_id: int | None = None,
) -> Ticket:
    ticket = Ticket(
        title=title,
        description=description,
        category=category,
        priority=priority,
        status=status,
        creator_id=creator_id,
        assignee_id=assignee_id,
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


def _auth(user: User) -> dict[str, str]:
    token = create_access_token(str(user.id))
    return {"Authorization": f"Bearer {token}"}


def test_detail_returns_ticket_comments_and_audit(client, session_factory):
    session = session_factory()
    melder = _make_user(session, "melder@example.com", "Melder")
    ticket = _make_ticket(session, melder.id)
    session.close()

    response = client.get(f"/api/tickets/{ticket.id}", headers=_auth(melder))
    assert response.status_code == 200
    body = response.json()
    assert body["ticket"]["id"] == ticket.id
    assert body["ticket"]["title"] == "Test Ticket"
    assert body["comments"] == []
    assert body["audit_entries"] == []


def test_detail_melder_foreign_ticket_403(client, session_factory):
    session = session_factory()
    owner = _make_user(session, "owner@example.com", "Owner")
    stranger = _make_user(session, "stranger@example.com", "Stranger")
    ticket = _make_ticket(session, owner.id)
    session.close()

    response = client.get(f"/api/tickets/{ticket.id}", headers=_auth(stranger))
    assert response.status_code == 403


def test_detail_requires_auth(client, session_factory):
    session = session_factory()
    melder = _make_user(session, "melder@example.com", "Melder")
    ticket = _make_ticket(session, melder.id)
    session.close()

    response = client.get(f"/api/tickets/{ticket.id}")
    assert response.status_code == 401


def test_edit_creates_audit(client, session_factory):
    session = session_factory()
    melder = _make_user(session, "melder@example.com", "Melder")
    ticket = _make_ticket(session, melder.id, title="Old Title", priority=Priority.low)
    session.close()

    response = client.patch(
        f"/api/tickets/{ticket.id}",
        json={"title": "New Title", "priority": "high"},
        headers=_auth(melder),
    )
    assert response.status_code == 200
    assert response.json()["title"] == "New Title"
    assert response.json()["priority"] == "high"

    detail = client.get(f"/api/tickets/{ticket.id}", headers=_auth(melder)).json()
    fields = {(e["field"], e["old_value"], e["new_value"]) for e in detail["audit_entries"]}
    assert ("title", "Old Title", "New Title") in fields
    assert ("priority", "low", "high") in fields


def test_edit_unchanged_field_creates_no_audit(client, session_factory):
    session = session_factory()
    melder = _make_user(session, "melder@example.com", "Melder")
    ticket = _make_ticket(session, melder.id, title="Same")
    session.close()

    response = client.patch(
        f"/api/tickets/{ticket.id}",
        json={"title": "Same"},
        headers=_auth(melder),
    )
    assert response.status_code == 200

    detail = client.get(f"/api/tickets/{ticket.id}", headers=_auth(melder)).json()
    assert detail["audit_entries"] == []


def test_melder_cannot_edit_foreign_ticket(client, session_factory):
    session = session_factory()
    owner = _make_user(session, "owner@example.com", "Owner")
    stranger = _make_user(session, "stranger@example.com", "Stranger")
    ticket = _make_ticket(session, owner.id)
    session.close()

    response = client.patch(
        f"/api/tickets/{ticket.id}",
        json={"title": "Hijacked"},
        headers=_auth(stranger),
    )
    assert response.status_code == 403


def test_melder_cannot_edit_own_closed_ticket(client, session_factory):
    session = session_factory()
    melder = _make_user(session, "melder@example.com", "Melder")
    ticket = _make_ticket(session, melder.id, status=Status.closed)
    session.close()

    response = client.patch(
        f"/api/tickets/{ticket.id}",
        json={"title": "New"},
        headers=_auth(melder),
    )
    assert response.status_code == 403


def test_agent_can_edit_any_ticket(client, session_factory):
    session = session_factory()
    melder = _make_user(session, "melder@example.com", "Melder")
    agent = _make_user(session, "agent@example.com", "Agent", role=Role.agent)
    ticket = _make_ticket(session, melder.id)
    session.close()

    response = client.patch(
        f"/api/tickets/{ticket.id}",
        json={"priority": "critical"},
        headers=_auth(agent),
    )
    assert response.status_code == 200
    assert response.json()["priority"] == "critical"


def test_assign_sets_assignee_and_audit(client, session_factory):
    session = session_factory()
    melder = _make_user(session, "melder@example.com", "Melder")
    agent = _make_user(session, "agent@example.com", "Agent", role=Role.agent)
    ticket = _make_ticket(session, melder.id)
    session.close()

    response = client.post(
        f"/api/tickets/{ticket.id}/assign",
        json={"agent_id": agent.id},
        headers=_auth(agent),
    )
    assert response.status_code == 200
    assert response.json()["assignee_id"] == agent.id
    assert response.json()["assignee_name"] == "Agent"

    detail = client.get(f"/api/tickets/{ticket.id}", headers=_auth(melder)).json()
    assert detail["ticket"]["assignee_id"] == agent.id
    fields = {(e["field"], e["old_value"], e["new_value"]) for e in detail["audit_entries"]}
    assert ("assignee_id", None, str(agent.id)) in fields


def test_assign_only_to_active_agent(client, session_factory):
    session = session_factory()
    melder = _make_user(session, "melder@example.com", "Melder")
    agent = _make_user(session, "agent@example.com", "Agent", role=Role.agent)
    inactive_agent = _make_user(session, "off@example.com", "Off", role=Role.agent, is_active=False)
    admin = _make_user(session, "admin@example.com", "Admin", role=Role.admin)
    ticket = _make_ticket(session, melder.id)
    session.close()

    assert (
        client.post(
            f"/api/tickets/{ticket.id}/assign",
            json={"agent_id": inactive_agent.id},
            headers=_auth(agent),
        ).status_code
        == 400
    )
    assert (
        client.post(
            f"/api/tickets/{ticket.id}/assign",
            json={"agent_id": melder.id},
            headers=_auth(agent),
        ).status_code
        == 400
    )
    assert (
        client.post(
            f"/api/tickets/{ticket.id}/assign",
            json={"agent_id": admin.id},
            headers=_auth(agent),
        ).status_code
        == 400
    )
    assert (
        client.post(
            f"/api/tickets/{ticket.id}/assign",
            json={"agent_id": 99999},
            headers=_auth(agent),
        ).status_code
        == 400
    )


def test_assign_requires_agent_or_admin(client, session_factory):
    session = session_factory()
    melder = _make_user(session, "melder@example.com", "Melder")
    agent = _make_user(session, "agent@example.com", "Agent", role=Role.agent)
    ticket = _make_ticket(session, melder.id)
    session.close()

    response = client.post(
        f"/api/tickets/{ticket.id}/assign",
        json={"agent_id": agent.id},
        headers=_auth(melder),
    )
    assert response.status_code == 403


def test_close_and_reopen(client, session_factory):
    session = session_factory()
    melder = _make_user(session, "melder@example.com", "Melder")
    agent = _make_user(session, "agent@example.com", "Agent", role=Role.agent)
    ticket = _make_ticket(session, melder.id)
    session.close()

    close = client.post(f"/api/tickets/{ticket.id}/close", headers=_auth(melder))
    assert close.status_code == 200
    assert close.json()["status"] == "closed"

    detail = client.get(f"/api/tickets/{ticket.id}", headers=_auth(melder)).json()
    assert any(
        e["field"] == "status" and e["new_value"] == "closed" for e in detail["audit_entries"]
    )

    reopen = client.post(f"/api/tickets/{ticket.id}/reopen", headers=_auth(agent))
    assert reopen.status_code == 200
    assert reopen.json()["status"] == "open"

    detail = client.get(f"/api/tickets/{ticket.id}", headers=_auth(melder)).json()
    statuses = [e["new_value"] for e in detail["audit_entries"] if e["field"] == "status"]
    assert statuses == ["closed", "open"]


def test_reopen_requires_agent_or_admin(client, session_factory):
    session = session_factory()
    melder = _make_user(session, "melder@example.com", "Melder")
    ticket = _make_ticket(session, melder.id, status=Status.closed)
    session.close()

    response = client.post(f"/api/tickets/{ticket.id}/reopen", headers=_auth(melder))
    assert response.status_code == 403


def test_melder_cannot_close_foreign_ticket(client, session_factory):
    session = session_factory()
    owner = _make_user(session, "owner@example.com", "Owner")
    stranger = _make_user(session, "stranger@example.com", "Stranger")
    ticket = _make_ticket(session, owner.id)
    session.close()

    response = client.post(f"/api/tickets/{ticket.id}/close", headers=_auth(stranger))
    assert response.status_code == 403


def test_detail_404_for_missing_ticket(client, session_factory):
    session = session_factory()
    agent = _make_user(session, "agent@example.com", "Agent", role=Role.agent)
    session.close()

    response = client.get("/api/tickets/99999", headers=_auth(agent))
    assert response.status_code == 404
