"""Tests for ticket creation, the searchable list and the SLA calculation."""

import os
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.core.security import create_access_token
from app.database import Base, get_db
from app.main import app
from app.models import Priority, Role, Status, Ticket, User, utcnow
from app.services.sla import compute_due_at

os.environ["JWT_SECRET"] = "test-secret-key-for-ticket-tests"
object.__setattr__(settings, "jwt_secret", "test-secret-key-for-ticket-tests")


@pytest.fixture()
def engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def session_factory(engine):
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


@pytest.fixture()
def db_session(session_factory):
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _create_user(db, email, display_name="Name", role=Role.melder):
    user = User(
        email=email,
        display_name=display_name,
        password_hash="unused",
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth(user_id):
    return {"Authorization": f"Bearer {create_access_token(str(user_id))}"}


def _create_ticket(client, user_id, **overrides):
    body = {
        "title": "Drucker kaputt",
        "description": "Drucker druckt nichts mehr",
        "category": "hardware",
        "priority": "high",
    }
    body.update(overrides)
    return client.post("/api/tickets", json=body, headers=_auth(user_id))


# --- SLA calculation ---


def test_sla_low_plus_seven_days():
    created = utcnow()
    assert compute_due_at(Priority.low, created) == created + timedelta(days=7)


def test_sla_medium_plus_three_days():
    created = utcnow()
    assert compute_due_at(Priority.medium, created) == created + timedelta(days=3)


def test_sla_high_plus_one_day():
    created = utcnow()
    assert compute_due_at(Priority.high, created) == created + timedelta(days=1)


def test_sla_critical_plus_four_hours():
    created = utcnow()
    assert compute_due_at(Priority.critical, created) == created + timedelta(hours=4)


def test_sla_defaults_to_now():
    before = utcnow()
    due = compute_due_at(Priority.high)
    assert due >= before + timedelta(days=1)
    assert due <= utcnow() + timedelta(days=1)


# --- Creation ---


def test_create_ticket_returns_201_open_with_due_at(client, db_session):
    user = _create_user(db_session, "melder@example.com")
    resp = _create_ticket(client, user.id)

    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Drucker kaputt"
    assert data["status"] == "open"
    assert data["priority"] == "high"
    assert data["category"] == "hardware"
    assert data["due_at"] is not None
    assert data["is_overdue"] is False
    assert data["assignee_id"] is None
    assert data["assignee_name"] is None
    assert data["created_at"] is not None
    assert data["updated_at"] is not None


def test_create_ticket_sets_creator(client, db_session):
    user = _create_user(db_session, "melder@example.com")
    resp = _create_ticket(client, user.id)
    assert resp.status_code == 201

    ticket = db_session.query(Ticket).filter(Ticket.id == resp.json()["id"]).first()
    assert ticket.creator_id == user.id
    assert ticket.status == Status.open


def test_create_ticket_requires_auth(client):
    resp = client.post(
        "/api/tickets",
        json={
            "title": "x",
            "description": "y",
            "category": "hardware",
            "priority": "low",
        },
    )
    assert resp.status_code == 401


def test_create_ticket_invalid_priority_422(client, db_session):
    user = _create_user(db_session, "melder@example.com")
    resp = client.post(
        "/api/tickets",
        json={
            "title": "x",
            "description": "y",
            "category": "hardware",
            "priority": "urgent",
        },
        headers=_auth(user.id),
    )
    assert resp.status_code == 422


def test_create_ticket_empty_title_422(client, db_session):
    user = _create_user(db_session, "melder@example.com")
    resp = _create_ticket(client, user.id, title="")
    assert resp.status_code == 422


# --- Search ---


def test_search_matches_title_and_description(client, db_session):
    user = _create_user(db_session, "agent@example.com", role=Role.agent)
    _create_ticket(client, user.id, title="Drucker streikt", description="normal")
    _create_ticket(client, user.id, title="Netzwerk weg", description="VPN streikt")
    _create_ticket(client, user.id, title="Maus kaputt", description="normal")

    resp = client.get("/api/tickets", params={"search": "streikt"}, headers=_auth(user.id))
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    titles = {item["title"] for item in body["items"]}
    assert titles == {"Drucker streikt", "Netzwerk weg"}


# --- Filters ---


def test_filter_by_status(client, db_session):
    user = _create_user(db_session, "agent@example.com", role=Role.agent)
    resp = _create_ticket(client, user.id, title="offen")
    ticket_id = resp.json()["id"]
    db_session.query(Ticket).filter(Ticket.id == ticket_id).update({Ticket.status: Status.closed})
    db_session.commit()

    resp = client.get("/api/tickets", params={"status": "closed"}, headers=_auth(user.id))
    assert resp.json()["total"] == 1
    resp = client.get("/api/tickets", params={"status": "open"}, headers=_auth(user.id))
    assert resp.json()["total"] == 0


def test_filter_by_priority(client, db_session):
    user = _create_user(db_session, "agent@example.com", role=Role.agent)
    _create_ticket(client, user.id, title="a", priority="low")
    _create_ticket(client, user.id, title="b", priority="critical")

    resp = client.get("/api/tickets", params={"priority": "critical"}, headers=_auth(user.id))
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "b"


def test_filter_by_assignee(client, db_session):
    agent = _create_user(db_session, "agent@example.com", role=Role.agent)
    other = _create_user(db_session, "other@example.com", role=Role.agent)
    _create_ticket(client, agent.id, title="assigned")

    db_session.query(Ticket).filter(Ticket.title == "assigned").update(
        {Ticket.assignee_id: other.id}
    )
    db_session.commit()

    resp = client.get("/api/tickets", params={"assignee": other.id}, headers=_auth(agent.id))
    assert resp.json()["total"] == 1
    resp = client.get("/api/tickets", params={"assignee": agent.id}, headers=_auth(agent.id))
    assert resp.json()["total"] == 0


# --- Sorting ---


def test_sort_by_created_at(client, db_session):
    user = _create_user(db_session, "agent@example.com", role=Role.agent)
    _create_ticket(client, user.id, title="first")
    _create_ticket(client, user.id, title="second")

    resp = client.get(
        "/api/tickets", params={"sort": "created_at", "order": "asc"}, headers=_auth(user.id)
    )
    titles = [item["title"] for item in resp.json()["items"]]
    assert titles == ["first", "second"]

    resp = client.get(
        "/api/tickets", params={"sort": "created_at", "order": "desc"}, headers=_auth(user.id)
    )
    titles = [item["title"] for item in resp.json()["items"]]
    assert titles == ["second", "first"]


def test_sort_by_priority_severity(client, db_session):
    user = _create_user(db_session, "agent@example.com", role=Role.agent)
    _create_ticket(client, user.id, title="low", priority="low")
    _create_ticket(client, user.id, title="critical", priority="critical")
    _create_ticket(client, user.id, title="medium", priority="medium")

    resp = client.get(
        "/api/tickets", params={"sort": "priority", "order": "desc"}, headers=_auth(user.id)
    )
    priorities = [item["priority"] for item in resp.json()["items"]]
    assert priorities == ["critical", "medium", "low"]


def test_invalid_sort_422(client, db_session):
    user = _create_user(db_session, "agent@example.com", role=Role.agent)
    resp = client.get("/api/tickets", params={"sort": "bogus"}, headers=_auth(user.id))
    assert resp.status_code == 422


# --- Pagination ---


def test_pagination(client, db_session):
    user = _create_user(db_session, "agent@example.com", role=Role.agent)
    for i in range(5):
        _create_ticket(client, user.id, title=f"ticket-{i}")

    resp = client.get("/api/tickets", params={"page": 1, "page_size": 2}, headers=_auth(user.id))
    body = resp.json()
    assert body["total"] == 5
    assert body["page"] == 1
    assert body["page_size"] == 2
    assert len(body["items"]) == 2

    resp = client.get("/api/tickets", params={"page": 3, "page_size": 2}, headers=_auth(user.id))
    body = resp.json()
    assert len(body["items"]) == 1


# --- Melder restriction ---


def test_melder_sees_only_own_tickets(client, db_session):
    melder_a = _create_user(db_session, "a@example.com", "Alice", Role.melder)
    melder_b = _create_user(db_session, "b@example.com", "Bob", Role.melder)
    _create_ticket(client, melder_a.id, title="alices ticket")
    _create_ticket(client, melder_b.id, title="bobs ticket")

    resp = client.get("/api/tickets", headers=_auth(melder_a.id))
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "alices ticket"


def test_agent_sees_all_tickets(client, db_session):
    melder = _create_user(db_session, "m@example.com", "Melder", Role.melder)
    agent = _create_user(db_session, "agent@example.com", "Agent", Role.agent)
    _create_ticket(client, melder.id, title="one")
    _create_ticket(client, melder.id, title="two")

    resp = client.get("/api/tickets", headers=_auth(agent.id))
    assert resp.json()["total"] == 2


# --- Overdue marking ---


def test_overdue_marked_for_past_due_open_ticket(client, db_session):
    user = _create_user(db_session, "agent@example.com", role=Role.agent)
    ticket_id = _create_ticket(client, user.id, title="overdue").json()["id"]

    db_session.query(Ticket).filter(Ticket.id == ticket_id).update(
        {Ticket.due_at: utcnow() - timedelta(hours=1)}
    )
    db_session.commit()

    resp = client.get("/api/tickets", headers=_auth(user.id))
    item = next(t for t in resp.json()["items"] if t["id"] == ticket_id)
    assert item["is_overdue"] is True


def test_closed_ticket_not_overdue(client, db_session):
    user = _create_user(db_session, "agent@example.com", role=Role.agent)
    ticket_id = _create_ticket(client, user.id, title="closed").json()["id"]

    db_session.query(Ticket).filter(Ticket.id == ticket_id).update(
        {Ticket.due_at: utcnow() - timedelta(hours=1), Ticket.status: Status.closed}
    )
    db_session.commit()

    resp = client.get("/api/tickets", headers=_auth(user.id))
    item = next(t for t in resp.json()["items"] if t["id"] == ticket_id)
    assert item["is_overdue"] is False


def test_list_requires_auth(client):
    resp = client.get("/api/tickets")
    assert resp.status_code == 401


def test_invalid_category_422(client, db_session):
    user = _create_user(db_session, "melder@example.com")
    resp = client.post(
        "/api/tickets",
        json={
            "title": "x",
            "description": "y",
            "category": "furniture",
            "priority": "low",
        },
        headers=_auth(user.id),
    )
    assert resp.status_code == 422
