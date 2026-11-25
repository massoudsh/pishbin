"""CORS_ORIGINS must accept comma-separated values without crashing at import.

Regression: a list-typed setting made pydantic-settings JSON-decode the raw env
value first, so CORS_ORIGINS=http://localhost:3000 aborted app startup.
"""
import importlib
import os

import pytest

from app.core import config as config_module


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("http://localhost:3000", ["http://localhost:3000"]),
        ("https://a.com,https://b.com", ["https://a.com", "https://b.com"]),
        ("https://a.com, https://b.com", ["https://a.com", "https://b.com"]),
        ('["https://a.com","https://b.com"]', ["https://a.com", "https://b.com"]),
    ],
)
def test_comma_separated_and_json_origins(monkeypatch, raw, expected):
    monkeypatch.setenv("CORS_ORIGINS", raw)
    monkeypatch.setenv("DEBUG", "true")
    reloaded = importlib.reload(config_module)
    try:
        assert reloaded.settings.cors_origins == expected
    finally:
        monkeypatch.undo()
        importlib.reload(config_module)


def test_empty_origins_fall_back_to_defaults():
    assert config_module._parse_cors_origins("") == config_module.DEFAULT_CORS_ORIGINS
    assert config_module._parse_cors_origins(None) == config_module.DEFAULT_CORS_ORIGINS


def test_cors_preflight_allows_configured_origin(client):
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code in (200, 400)
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
