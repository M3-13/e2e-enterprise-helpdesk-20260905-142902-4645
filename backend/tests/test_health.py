"""Tests for the health endpoint."""


def test_health_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
