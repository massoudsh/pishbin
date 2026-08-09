"""
Check (cheque) API tests using FastAPI TestClient.
"""
from datetime import date, timedelta

from fastapi.testclient import TestClient

API = "/api/v1"


def _register_and_login(client: TestClient, username: str, email: str) -> str:
    client.post(f"{API}/auth/register", json={
        "email": email,
        "username": username,
        "password": "Password123",
        "full_name": "Check Owner",
    })
    resp = client.post(
        f"{API}/auth/login",
        data={"username": username, "password": "Password123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_account(client: TestClient, headers: dict) -> int:
    businesses = client.get(f"{API}/businesses/", headers=headers).json()
    business_id = businesses[0]["id"]
    resp = client.post(f"{API}/accounts/", json={
        "business_id": business_id,
        "name": "حساب چک",
        "account_type": "checking",
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def test_create_and_list_check(client: TestClient):
    """A cheque can be registered against the user's own account and shows up in the list."""
    token = _register_and_login(client, "checkuser", "check@example.com")
    headers = _auth_headers(token)
    account_id = _create_account(client, headers)

    due = (date.today() + timedelta(days=10)).isoformat()
    resp = client.post(f"{API}/checks/", json={
        "account_id": account_id,
        "direction": "received",
        "counterparty_name": "شرکت الف",
        "amount": "5000000",
        "bank_name": "بانک ملت",
        "sayad_id": "1234567890123456",
        "due_date": due,
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    check = resp.json()
    assert check["status"] == "pending"
    assert check["direction"] == "received"

    resp = client.get(f"{API}/checks/", headers=headers)
    assert resp.status_code == 200
    checks = resp.json()
    assert len(checks) == 1
    assert checks[0]["id"] == check["id"]


def test_check_requires_own_account(client: TestClient):
    """Creating a cheque against another user's account must fail with 404."""
    token = _register_and_login(client, "checkowner", "checkowner@example.com")
    headers = _auth_headers(token)
    account_id = _create_account(client, headers)

    other_token = _register_and_login(client, "checkintruder", "checkintruder@example.com")
    other_headers = _auth_headers(other_token)

    resp = client.post(f"{API}/checks/", json={
        "account_id": account_id,
        "direction": "issued",
        "counterparty_name": "نفوذ",
        "amount": "1000000",
        "due_date": date.today().isoformat(),
    }, headers=other_headers)
    assert resp.status_code == 404


def test_update_status_to_cleared(client: TestClient):
    """A pending cheque can be marked as cleared."""
    token = _register_and_login(client, "checkclear", "checkclear@example.com")
    headers = _auth_headers(token)
    account_id = _create_account(client, headers)

    resp = client.post(f"{API}/checks/", json={
        "account_id": account_id,
        "direction": "issued",
        "counterparty_name": "تامین‌کننده",
        "amount": "2000000",
        "due_date": date.today().isoformat(),
    }, headers=headers)
    check_id = resp.json()["id"]

    resp = client.put(f"{API}/checks/{check_id}", json={"status": "cleared"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "cleared"


def test_cannot_delete_cleared_check(client: TestClient):
    """Deleting a cleared cheque is blocked; it must be voided instead."""
    token = _register_and_login(client, "checkdel", "checkdel@example.com")
    headers = _auth_headers(token)
    account_id = _create_account(client, headers)

    resp = client.post(f"{API}/checks/", json={
        "account_id": account_id,
        "direction": "issued",
        "counterparty_name": "تامین‌کننده",
        "amount": "2000000",
        "due_date": date.today().isoformat(),
    }, headers=headers)
    check_id = resp.json()["id"]
    client.put(f"{API}/checks/{check_id}", json={"status": "cleared"}, headers=headers)

    resp = client.delete(f"{API}/checks/{check_id}", headers=headers)
    assert resp.status_code == 400


def test_cash_flow_forecast_includes_pending_checks(client: TestClient):
    """Pending cheques due within the window show up in the cash-flow forecast, split by direction."""
    token = _register_and_login(client, "checkforecast", "checkforecast@example.com")
    headers = _auth_headers(token)
    account_id = _create_account(client, headers)

    due_soon = (date.today() + timedelta(days=5)).isoformat()
    due_far = (date.today() + timedelta(days=90)).isoformat()

    client.post(f"{API}/checks/", json={
        "account_id": account_id,
        "direction": "received",
        "counterparty_name": "مشتری",
        "amount": "3000000",
        "due_date": due_soon,
    }, headers=headers)
    client.post(f"{API}/checks/", json={
        "account_id": account_id,
        "direction": "issued",
        "counterparty_name": "تامین‌کننده",
        "amount": "1000000",
        "due_date": due_soon,
    }, headers=headers)
    # Outside the 30-day window — should not appear.
    client.post(f"{API}/checks/", json={
        "account_id": account_id,
        "direction": "received",
        "counterparty_name": "مشتری دیگر",
        "amount": "9000000",
        "due_date": due_far,
    }, headers=headers)

    resp = client.get(f"{API}/checks/cash-flow-forecast?days=30", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["events"]) == 2
    assert data["total_inflow"] == 3000000.0
    assert data["total_outflow"] == 1000000.0
    assert data["net"] == 2000000.0
