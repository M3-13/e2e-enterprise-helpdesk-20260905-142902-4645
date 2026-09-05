"""Tests for the user management endpoints (admin create/update/delete + self-delete)."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.deps import get_db
from app.core.security import create_access_token
from app.database import Base
from app.main import app
from app.models import Category, Comment, Priority, Role, Status, Ticket, User

TEST_SECRET = "test-secret-for-user-management-tests"


@pytest.fixture(autouse=True)
def _patch_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.core.security._secret", lambda: TEST_SECRET)


@pytest.fixture()
def session_factory(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    yield sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(session_factory) -> Iterator[TestClient]:
    def override_get_db() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def _create_user(
    session_factory,
    email: str,
    role: Role,
    *,
    is_active: bool = True,
    display_name: str = "User",
) -> int:
    with session_factory() as db:
        user = User(
            email=email,
            display_name=display_name,
            password_hash="hash",
            role=role,
            is_active=is_active,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _admin_token(session_factory) -> str:
    admin_id = _create_user(session_factory, "admin@example.com", Role.admin, display_name="Admin")
    return create_access_token(str(admin_id))


def test_list_users_requires_admin(client, session_factory):
    admin_id = _create_user(session_factory, "admin@example.com", Role.admin)
    agent_id = _create_user(session_factory, "agent@example.com", Role.agent)
    admin_token = create_access_token(str(admin_id))
    agent_token = create_access_token(str(agent_id))

    assert client.get("/api/users").status_code == 401

    assert client.get("/api/users", headers=_auth(agent_token)).status_code == 403

    response = client.get("/api/users", headers=_auth(admin_token))
    assert response.status_code == 200
    emails = {user["email"] for user in response.json()}
    assert "admin@example.com" in emails
    assert "agent@example.com" in emails


def test_admin_creates_user(client, session_factory):
    token = _admin_token(session_factory)

    response = client.post(
        "/api/users",
        json={
            "email": "new@example.com",
            "display_name": "New Agent",
            "password": "supersecret",
            "role": "agent",
        },
        headers=_auth(token),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"
    assert body["display_name"] == "New Agent"
    assert body["role"] == "agent"
    assert body["is_active"] is True

    duplicate = client.post(
        "/api/users",
        json={
            "email": "new@example.com",
            "display_name": "Other",
            "password": "supersecret",
            "role": "agent",
        },
        headers=_auth(token),
    )
    assert duplicate.status_code == 409


def test_admin_changes_role_and_deactivates(client, session_factory):
    token = _admin_token(session_factory)
    user_id = _create_user(session_factory, "agent@example.com", Role.agent)

    changed = client.patch(f"/api/users/{user_id}", json={"role": "admin"}, headers=_auth(token))
    assert changed.status_code == 200
    assert changed.json()["role"] == "admin"

    deactivated = client.patch(
        f"/api/users/{user_id}", json={"is_active": False}, headers=_auth(token)
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False


def test_deactivated_user_is_rejected(client, session_factory):
    admin_id = _create_user(session_factory, "admin@example.com", Role.admin)
    user_id = _create_user(session_factory, "deactivate@example.com", Role.agent)
    admin_token = create_access_token(str(admin_id))
    user_token = create_access_token(str(user_id))

    assert client.get("/api/users", headers=_auth(user_token)).status_code == 403

    client.patch(f"/api/users/{user_id}", json={"is_active": False}, headers=_auth(admin_token))

    assert client.get("/api/users", headers=_auth(user_token)).status_code == 401


def test_admin_delete_anonymizes_references(client, session_factory):
    token = _admin_token(session_factory)
    user_id = _create_user(
        session_factory, "victim@example.com", Role.melder, display_name="Victim"
    )

    with session_factory() as db:
        ticket = Ticket(
            title="A ticket",
            description="Body",
            category=Category.other,
            priority=Priority.low,
            status=Status.open,
            creator_id=user_id,
        )
        db.add(ticket)
        db.flush()
        db.add(Comment(ticket_id=ticket.id, author_id=user_id, body="hello"))
        db.commit()
        ticket_id = ticket.id

    response = client.delete(f"/api/users/{user_id}", headers=_auth(token))
    assert response.status_code == 204

    with session_factory() as db:
        user = db.get(User, user_id)
        assert user.email == f"deleted-{user_id}@invalid.local"
        assert user.display_name == "Gelöschter Benutzer"
        assert user.password_hash == ""
        assert user.is_active is False

        comment = db.query(Comment).filter(Comment.ticket_id == ticket_id).first()
        assert comment.author_name == "Gelöschter Benutzer"

        ticket = db.get(Ticket, ticket_id)
        assert ticket.assignee_name is None


def test_delete_user_missing_returns_404(client, session_factory):
    token = _admin_token(session_factory)
    assert client.delete("/api/users/9999", headers=_auth(token)).status_code == 404


def test_delete_self_anonymizes_account(client, session_factory):
    user_id = _create_user(session_factory, "self@example.com", Role.melder, display_name="Me")
    token = create_access_token(str(user_id))

    assert client.delete("/api/users/me", headers=_auth(token)).status_code == 204

    with session_factory() as db:
        user = db.get(User, user_id)
        assert user.email == f"deleted-{user_id}@invalid.local"
        assert user.display_name == "Gelöschter Benutzer"
        assert user.password_hash == ""
        assert user.is_active is False

    assert client.delete("/api/users/me", headers=_auth(token)).status_code == 401
