"""Tests for the ticket comment endpoint."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_db
from app.config import settings
from app.core.security import create_access_token, hash_password
from app.database import Base
from app.main import app
from app.models import Comment, Role, Ticket, User


@pytest.fixture()
def session_factory(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def client(session_factory):
    object.__setattr__(settings, "jwt_secret", "test-secret-key-with-at-least-32-bytes")

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _create_user(factory, *, email, name, role):
    db = factory()
    user = User(
        email=email,
        display_name=name,
        password_hash=hash_password("password123"),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    db.close()
    return user_id


def _create_ticket(factory, *, creator_id, title="Problem"):
    db = factory()
    ticket = Ticket(
        title=title,
        description="Beschreibung",
        category="hardware",
        priority="low",
        creator_id=creator_id,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    ticket_id = ticket.id
    db.close()
    return ticket_id


def _auth_headers(user_id):
    token = create_access_token(str(user_id))
    return {"Authorization": f"Bearer {token}"}


def test_melder_can_comment_own_ticket(client, session_factory):
    melder_id = _create_user(
        session_factory, email="melder@x.com", name="Melder Eins", role=Role.melder
    )
    ticket_id = _create_ticket(session_factory, creator_id=melder_id)

    response = client.post(
        f"/api/tickets/{ticket_id}/comments",
        json={"body": "Mein Kommentar"},
        headers=_auth_headers(melder_id),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["body"] == "Mein Kommentar"
    assert data["author_name"] == "Melder Eins"
    assert data["created_at"] is not None


def test_melder_cannot_comment_other_ticket(client, session_factory):
    owner_id = _create_user(session_factory, email="owner@x.com", name="Owner", role=Role.melder)
    other_id = _create_user(session_factory, email="other@x.com", name="Other", role=Role.melder)
    ticket_id = _create_ticket(session_factory, creator_id=owner_id)

    response = client.post(
        f"/api/tickets/{ticket_id}/comments",
        json={"body": "Darf nicht"},
        headers=_auth_headers(other_id),
    )

    assert response.status_code == 403


def test_agent_can_comment_any_ticket(client, session_factory):
    melder_id = _create_user(session_factory, email="melder@x.com", name="Melder", role=Role.melder)
    agent_id = _create_user(session_factory, email="agent@x.com", name="Agent", role=Role.agent)
    ticket_id = _create_ticket(session_factory, creator_id=melder_id)

    response = client.post(
        f"/api/tickets/{ticket_id}/comments",
        json={"body": "Agent antwortet"},
        headers=_auth_headers(agent_id),
    )

    assert response.status_code == 201
    assert response.json()["author_name"] == "Agent"


def test_comment_requires_auth(client, session_factory):
    melder_id = _create_user(session_factory, email="melder@x.com", name="Melder", role=Role.melder)
    ticket_id = _create_ticket(session_factory, creator_id=melder_id)

    response = client.post(f"/api/tickets/{ticket_id}/comments", json={"body": "ohne Token"})

    assert response.status_code == 401


def test_comment_on_missing_ticket_returns_404(client, session_factory):
    agent_id = _create_user(session_factory, email="agent@x.com", name="Agent", role=Role.agent)

    response = client.post(
        "/api/tickets/999/comments",
        json={"body": "nichts"},
        headers=_auth_headers(agent_id),
    )

    assert response.status_code == 404


def test_comments_are_chronological(client, session_factory):
    melder_id = _create_user(session_factory, email="melder@x.com", name="Melder", role=Role.melder)
    ticket_id = _create_ticket(session_factory, creator_id=melder_id)

    for body in ("erster", "zweiter", "dritter"):
        response = client.post(
            f"/api/tickets/{ticket_id}/comments",
            json={"body": body},
            headers=_auth_headers(melder_id),
        )
        assert response.status_code == 201

    db = session_factory()
    comments = (
        db.query(Comment)
        .filter(Comment.ticket_id == ticket_id)
        .order_by(Comment.created_at.asc(), Comment.id.asc())
        .all()
    )
    db.close()

    assert [c.body for c in comments] == ["erster", "zweiter", "dritter"]
