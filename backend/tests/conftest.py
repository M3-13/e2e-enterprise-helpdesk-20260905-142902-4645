"""Shared pytest fixtures for the backend test suite."""

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def jwt_secret():
    original = settings.jwt_secret
    object.__setattr__(settings, "jwt_secret", "test-secret-key-with-at-least-32-bytes")
    yield
    object.__setattr__(settings, "jwt_secret", original)


@pytest.fixture()
def client():
    return TestClient(app)
