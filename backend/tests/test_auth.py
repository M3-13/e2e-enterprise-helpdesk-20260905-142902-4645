"""Tests for the auth endpoints: register, login, logout, me and rate limiting."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.routers.auth import auth_limiter
from app.config import settings
from app.core.security import verify_password
from app.database import Base, get_db
from app.main import app
from app.models import User


@pytest.fixture(autouse=True)
def _jwt_secret():
    original = settings.jwt_secret
    object.__setattr__(settings, "jwt_secret", "test-signing-secret-0123456789abcdef")
    yield
    object.__setattr__(settings, "jwt_secret", original)


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    auth_limiter.reset()
    yield
    auth_limiter.reset()


@pytest.fixture()
def session_factory(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=engine)
    yield sessionmaker(autocommit=False, autoflush=False, bind=engine)


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
    app.dependency_overrides.pop(get_db, None)


def _register(client, email="melder@example.com", password="secret-password"):
    return client.post(
        "/api/auth/register",
        json={"email": email, "display_name": "Melder One", "password": password},
    )


def _login(client, email="melder@example.com", password="secret-password"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def test_register_creates_melder_with_bcrypt_hash(client, session_factory):
    resp = _register(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == "melder@example.com"
    assert body["role"] == "melder"
    assert body["is_active"] is True

    db = session_factory()
    user = db.query(User).filter(User.email == "melder@example.com").one()
    assert user.role == "melder"
    assert user.password_hash != "secret-password"
    assert user.password_hash.startswith("$2")
    assert verify_password("secret-password", user.password_hash)
    db.close()


def test_register_duplicate_email_returns_409(client):
    assert _register(client).status_code == 201
    resp = _register(client)
    assert resp.status_code == 409
    assert resp.json()["detail"]


def test_login_returns_token(client):
    assert _register(client).status_code == 201
    resp = _login(client)
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_password_returns_401(client):
    assert _register(client).status_code == 201
    resp = _login(client, password="wrong-password")
    assert resp.status_code == 401
    assert resp.json()["detail"]


def test_login_inactive_account_returns_401(client, session_factory):
    assert _register(client).status_code == 201

    db = session_factory()
    user = db.query(User).filter(User.email == "melder@example.com").one()
    user.is_active = False
    db.commit()
    db.close()

    resp = _login(client)
    assert resp.status_code == 401
    assert resp.json()["detail"]


def test_me_returns_current_user(client):
    assert _register(client).status_code == 201
    token = _login(client).json()["access_token"]
    resp = client.get("/api/auth/me", headers=_auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "melder@example.com"


def test_me_without_token_returns_401(client):
    assert client.get("/api/auth/me").status_code == 401


def test_logout_revokes_token(client):
    assert _register(client).status_code == 201
    token = _login(client).json()["access_token"]
    assert client.get("/api/auth/me", headers=_auth_header(token)).status_code == 200

    logout_resp = client.post("/api/auth/logout", headers=_auth_header(token))
    assert logout_resp.status_code == 204

    assert client.get("/api/auth/me", headers=_auth_header(token)).status_code == 401


def test_login_rate_limit_returns_429(client):
    assert _register(client).status_code == 201
    for _ in range(5):
        resp = _login(client, password="wrong-password")
        assert resp.status_code == 401
    resp = _login(client, password="wrong-password")
    assert resp.status_code == 429


def test_register_rate_limit_returns_429(client):
    assert _register(client).status_code == 201
    for _ in range(5):
        resp = _register(client)
        assert resp.status_code == 409
    resp = _register(client)
    assert resp.status_code == 429
