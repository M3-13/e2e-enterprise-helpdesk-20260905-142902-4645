"""Tests for the CSV export of the filtered ticket list."""

import csv
import io
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.core.security import create_access_token
from app.database import Base, get_db
from app.main import app
from app.models import Role, Status, Ticket, User

os.environ["JWT_SECRET"] = "test-secret-key-for-export-tests"
object.__setattr__(settings, "jwt_secret", "test-secret-key-for-export-tests")

EXPECTED_HEADER = [
    "Titel",
    "Kategorie",
    "Priorität",
    "Status",
    "Zuständigkeit",
    "Erstelldatum",
    "Fälligkeitsdatum",
    "Überfällig-Kennzeichnung",
]


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


def _export_rows(response):
    return list(csv.reader(io.StringIO(response.text)))


def test_export_returns_csv_with_header_and_content_type(client, db_session):
    agent = _create_user(db_session, "agent@example.com", role=Role.agent)
    _create_ticket(client, agent.id, title="Ticket eins")
    _create_ticket(client, agent.id, title="Ticket zwei")

    resp = client.get("/api/export/tickets", headers=_auth(agent.id))

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    rows = _export_rows(resp)
    assert rows[0] == EXPECTED_HEADER
    assert len(rows) == 3
    assert {row[0] for row in rows[1:]} == {"Ticket eins", "Ticket zwei"}


def test_export_respects_status_filter(client, db_session):
    agent = _create_user(db_session, "agent@example.com", role=Role.agent)
    _create_ticket(client, agent.id, title="offen")
    _create_ticket(client, agent.id, title="geschlossen")

    db_session.query(Ticket).filter(Ticket.title == "geschlossen").update(
        {Ticket.status: Status.closed}
    )
    db_session.commit()

    resp = client.get("/api/export/tickets", params={"status": "open"}, headers=_auth(agent.id))
    rows = _export_rows(resp)
    assert len(rows) == 2
    assert rows[1][0] == "offen"


def test_export_respects_search_filter(client, db_session):
    agent = _create_user(db_session, "agent@example.com", role=Role.agent)
    _create_ticket(client, agent.id, title="Drucker streikt")
    _create_ticket(client, agent.id, title="Netzwerk weg")

    resp = client.get("/api/export/tickets", params={"search": "streikt"}, headers=_auth(agent.id))
    rows = _export_rows(resp)
    assert len(rows) == 2
    assert rows[1][0] == "Drucker streikt"


def test_export_respects_priority_filter(client, db_session):
    agent = _create_user(db_session, "agent@example.com", role=Role.agent)
    _create_ticket(client, agent.id, title="low", priority="low")
    _create_ticket(client, agent.id, title="critical", priority="critical")

    resp = client.get(
        "/api/export/tickets", params={"priority": "critical"}, headers=_auth(agent.id)
    )
    rows = _export_rows(resp)
    assert len(rows) == 2
    assert rows[1][0] == "critical"
    assert rows[1][2] == "critical"


def test_export_assignee_column_shows_display_name(client, db_session):
    agent = _create_user(db_session, "agent@example.com", "Alice", Role.agent)
    other = _create_user(db_session, "other@example.com", "Bob", Role.agent)
    _create_ticket(client, agent.id, title="zugewiesen")

    db_session.query(Ticket).filter(Ticket.title == "zugewiesen").update(
        {Ticket.assignee_id: other.id}
    )
    db_session.commit()

    resp = client.get("/api/export/tickets", headers=_auth(agent.id))
    rows = _export_rows(resp)
    assert len(rows) == 2
    assert rows[1][0] == "zugewiesen"
    assert rows[1][4] == "Bob"


def test_export_unassigned_ticket_has_empty_assignee(client, db_session):
    agent = _create_user(db_session, "agent@example.com", "Alice", Role.agent)
    _create_ticket(client, agent.id, title="frei")

    resp = client.get("/api/export/tickets", headers=_auth(agent.id))
    rows = _export_rows(resp)
    assert rows[1][4] == ""


def test_export_returns_all_tickets_without_pagination(client, db_session):
    agent = _create_user(db_session, "agent@example.com", role=Role.agent)
    for i in range(25):
        _create_ticket(client, agent.id, title=f"ticket-{i}")

    resp = client.get("/api/export/tickets", headers=_auth(agent.id))
    rows = _export_rows(resp)
    assert len(rows) == 26


def test_export_melder_gets_403(client, db_session):
    melder = _create_user(db_session, "melder@example.com", role=Role.melder)
    _create_ticket(client, melder.id, title="mein Ticket")

    resp = client.get("/api/export/tickets", headers=_auth(melder.id))
    assert resp.status_code == 403


def test_export_requires_auth(client):
    resp = client.get("/api/export/tickets")
    assert resp.status_code == 401
