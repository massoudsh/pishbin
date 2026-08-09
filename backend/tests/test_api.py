"""
API endpoint tests using FastAPI TestClient.
"""
from fastapi.testclient import TestClient


def test_root(client: TestClient):
    """Root returns Pishbin API info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data.get("message") == "Pishbin API"
    assert "version" in data
    assert data.get("docs") == "/docs"


def test_health(client: TestClient):
    """Health check returns healthy."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_api_v1_requires_auth(client: TestClient):
    """Protected API returns 401 without token."""
    response = client.get("/api/v1/accounts")
    assert response.status_code == 401
