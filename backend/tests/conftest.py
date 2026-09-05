"""Shared pytest fixtures for the backend test suite."""

import os

import pytest
from fastapi.testclient import TestClient

# Set the signing secret BEFORE any ``app.*`` module is imported anywhere in this
# test session. ``app.config._build_settings()`` reads ``JWT_SECRET`` from the
# environment at import time, so this mirrors the production path (RUN.json,
# class "generate") and keeps ``settings.jwt_secret`` non-empty for every test.
# A direct assignment (not ``setdefault``) also OVERWRITES a value the test runner
# may already have injected as an empty string, which ``setdefault`` would leave
# untouched and then fail with "JWT_SECRET is not configured".
os.environ["JWT_SECRET"] = "test-secret-key-with-at-least-32-bytes"


@pytest.fixture()
def client():
    from app.main import app

    return TestClient(app)
