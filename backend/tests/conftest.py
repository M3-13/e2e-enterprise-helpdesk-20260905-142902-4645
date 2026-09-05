"""Shared pytest fixtures for the backend test suite."""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def jwt_secret(monkeypatch):
    monkeypatch.setattr(
        "app.core.security._secret",
        lambda: "test-secret-key-with-at-least-32-bytes",
    )


@pytest.fixture()
def client():
    from app.main import app

    return TestClient(app)
