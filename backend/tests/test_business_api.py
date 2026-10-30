"""
Business (multi-workspace) API tests using FastAPI TestClient.
"""
from fastapi.testclient import TestClient

import pytest

API = "/api/v1"


def _register_and_login(client: TestClient, username: str = "bizuser", email: str = "biz@example.com") -> str:
    client.post(f"{API}/auth/register", json={
        "email": email,
        "username": username,
        "password": "Password123",
        "full_name": "Biz Owner",
    })
    resp = client.post(
        f"{API}/auth/login",
        data={"username": username, "password": "Password123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_register_creates_default_business(client: TestClient):
    """A new user automatically gets one default business."""
    token = _register_and_login(client, "defaultbiz", "defaultbiz@example.com")
    resp = client.get(f"{API}/businesses/", headers=_auth_headers(token))
    assert resp.status_code == 200
    businesses = resp.json()
    assert len(businesses) == 1
    assert businesses[0]["is_default"] is True


def test_create_second_business_and_switch(client: TestClient):
    """A user can create a second business and switch the default (active) one."""
    token = _register_and_login(client, "multibiz", "multibiz@example.com")
    headers = _auth_headers(token)

    resp = client.post(f"{API}/businesses/", json={"name": "شعبه دوم"}, headers=headers)
    assert resp.status_code == 201, resp.text
    second = resp.json()
    assert second["is_default"] is False

    resp = client.post(f"{API}/businesses/{second['id']}/set-default", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_default"] is True

    resp = client.get(f"{API}/businesses/", headers=headers)
    businesses = resp.json()
    defaults = [b for b in businesses if b["is_default"]]
    assert len(defaults) == 1
    assert defaults[0]["id"] == second["id"]


def test_account_requires_business_id_and_is_scoped(client: TestClient):
    """Accounts must belong to a business owned by the current user."""
    token = _register_and_login(client, "accbiz", "accbiz@example.com")
    headers = _auth_headers(token)

    businesses = client.get(f"{API}/businesses/", headers=headers).json()
    business_id = businesses[0]["id"]

    resp = client.post(f"{API}/accounts/", json={
        "business_id": business_id,
        "name": "حساب اصلی",
        "account_type": "checking",
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    account = resp.json()
    assert account["business_id"] == business_id

    # Creating an account under someone else's business must fail.
    other_token = _register_and_login(client, "otherbiz", "otherbiz@example.com")
    other_headers = _auth_headers(other_token)
    resp = client.post(f"{API}/accounts/", json={
        "business_id": business_id,
        "name": "نفوذ",
        "account_type": "checking",
    }, headers=other_headers)
    assert resp.status_code == 404


def test_cannot_delete_only_business(client: TestClient):
    """Deleting the last remaining business must be blocked."""
    token = _register_and_login(client, "onlybiz", "onlybiz@example.com")
    headers = _auth_headers(token)
    businesses = client.get(f"{API}/businesses/", headers=headers).json()
    business_id = businesses[0]["id"]

    resp = client.delete(f"{API}/businesses/{business_id}", headers=headers)
    assert resp.status_code == 400


def test_cannot_delete_business_with_accounts(client: TestClient):
    """Deleting a business that still owns accounts must be blocked."""
    token = _register_and_login(client, "withacc", "withacc@example.com")
    headers = _auth_headers(token)
    businesses = client.get(f"{API}/businesses/", headers=headers).json()
    default_id = businesses[0]["id"]

    resp = client.post(f"{API}/businesses/", json={"name": "شعبه دوم"}, headers=headers)
    second_id = resp.json()["id"]

    client.post(f"{API}/accounts/", json={
        "business_id": second_id,
        "name": "حساب شعبه دوم",
        "account_type": "checking",
    }, headers=headers)

    resp = client.delete(f"{API}/businesses/{second_id}", headers=headers)
    assert resp.status_code == 400

    # The empty default business, however, can still not be deleted while it's the last...
    # but here there are two, so deleting the account-less one directly should still fail
    # only for the one holding accounts; sanity check default_id still exists.
    resp = client.get(f"{API}/businesses/{default_id}", headers=headers)
    assert resp.status_code == 200


def test_account_cursor_preserves_order_scope_and_deleted_page_boundaries(client: TestClient):
    token = _register_and_login(client, "cursorowner", "cursorowner@example.com")
    headers = _auth_headers(token)
    business_id = client.get(f"{API}/businesses/", headers=headers).json()[0]["id"]
    second = client.post(f"{API}/businesses/", json={"name": "Second"}, headers=headers).json()["id"]
    ids = []
    for index in range(5):
        response = client.post(f"{API}/accounts/", json={
            "business_id": business_id if index < 4 else second,
            "name": f"Account {index}", "account_type": "checking",
        }, headers=headers)
        assert response.status_code == 201, response.text
        ids.append(response.json()["id"])
    first = client.get(f"{API}/accounts/", params={"limit": 2}, headers=headers)
    assert first.status_code == 200
    assert [a["id"] for a in first.json()] == ids[:2]
    assert client.delete(f"{API}/accounts/{ids[0]}", headers=headers).status_code == 204
    next_page = client.get(f"{API}/accounts/", params={"after_id": ids[1], "limit": 2}, headers=headers)
    assert [a["id"] for a in next_page.json()] == ids[2:4]
    filtered = client.get(f"{API}/accounts/", params={"after_id": ids[1], "business_id": business_id}, headers=headers)
    assert [a["id"] for a in filtered.json()] == ids[2:4]
    empty = client.get(f"{API}/accounts/", params={"after_id": ids[-1]}, headers=headers)
    assert empty.json() == []
    other = _auth_headers(_register_and_login(client, "cursorother", "cursorother@example.com"))
    assert client.get(f"{API}/accounts/", params={"after_id": ids[1]}, headers=other).json() == []


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 1001}, {"skip": -1}, {"after_id": 0}, {"after_id": -1}])
def test_account_pagination_rejects_invalid_parameters(client: TestClient, params):
    from uuid import uuid4
    name = f"page{uuid4().hex[:12]}"
    headers = _auth_headers(_register_and_login(client, name, f"{name}@example.com"))
    response = client.get(f"{API}/accounts/", params=params, headers=headers)
    assert response.status_code == 422
