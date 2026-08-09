"""
Pytest configuration and fixtures.
Set test database before app is imported so settings use in-memory SQLite.
"""
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("AUTO_CREATE_DB", "true")

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Test client with lifespan (startup/shutdown) events enabled so tables get created."""
    with TestClient(app) as c:
        yield c
