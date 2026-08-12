"""
Invoice API tests using FastAPI TestClient (issue #48).
"""
from datetime import date, timedelta

from fastapi.testclient import TestClient

API = "/api/v1"


def _register_and_login(client: TestClient, username: str, email: str) -> str:
    client.post(f"{API}/auth/register", json={
        "email": email,
        "username": username,
        "password": "Password123",
        "full_name": "Invoice Owner",
    })
    resp = client.post(
        f"{API}/auth/login",
        data={"username": username, "password": "Password123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _create_customer(client: TestClient, headers: dict) -> int:
    resp = client.post(f"{API}/customers/", json={"name": "مشتری فاکتور"}, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def test_create_and_list_invoice(client: TestClient):
    token = _register_and_login(client, "invuser", "inv@example.com")
    headers = _auth_headers(token)
    customer_id = _create_customer(client, headers)

    due = (date.today() + timedelta(days=15)).isoformat()
    resp = client.post(f"{API}/invoices/", json={
        "customer_id": customer_id,
        "amount": "8000000",
        "issue_date": date.today().isoformat(),
        "due_date": due,
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    invoice = resp.json()
    assert invoice["status"] == "issued"

    resp = client.get(f"{API}/invoices/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_invoice_requires_own_customer(client: TestClient):
    token = _register_and_login(client, "invowner", "invowner@example.com")
    headers = _auth_headers(token)
    customer_id = _create_customer(client, headers)

    other_token = _register_and_login(client, "invintruder", "invintruder@example.com")
    other_headers = _auth_headers(other_token)

    resp = client.post(f"{API}/invoices/", json={
        "customer_id": customer_id,
        "amount": "1000000",
        "issue_date": date.today().isoformat(),
        "due_date": date.today().isoformat(),
    }, headers=other_headers)
    assert resp.status_code == 404


def test_invoice_becomes_overdue_when_due_date_passes(client: TestClient):
    token = _register_and_login(client, "invoverdue", "invoverdue@example.com")
    headers = _auth_headers(token)
    customer_id = _create_customer(client, headers)

    past_due = (date.today() - timedelta(days=3)).isoformat()
    resp = client.post(f"{API}/invoices/", json={
        "customer_id": customer_id,
        "amount": "2000000",
        "issue_date": (date.today() - timedelta(days=20)).isoformat(),
        "due_date": past_due,
    }, headers=headers)
    invoice_id = resp.json()["id"]

    resp = client.get(f"{API}/invoices/{invoice_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "overdue"


def test_mark_paid_sets_paid_date(client: TestClient):
    token = _register_and_login(client, "invpaid", "invpaid@example.com")
    headers = _auth_headers(token)
    customer_id = _create_customer(client, headers)

    resp = client.post(f"{API}/invoices/", json={
        "customer_id": customer_id,
        "amount": "2000000",
        "issue_date": date.today().isoformat(),
        "due_date": date.today().isoformat(),
    }, headers=headers)
    invoice_id = resp.json()["id"]

    resp = client.put(f"{API}/invoices/{invoice_id}", json={"status": "paid"}, headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "paid"
    assert body["paid_date"] is not None


def test_cannot_delete_paid_invoice(client: TestClient):
    token = _register_and_login(client, "invdel", "invdel@example.com")
    headers = _auth_headers(token)
    customer_id = _create_customer(client, headers)

    resp = client.post(f"{API}/invoices/", json={
        "customer_id": customer_id,
        "amount": "2000000",
        "issue_date": date.today().isoformat(),
        "due_date": date.today().isoformat(),
    }, headers=headers)
    invoice_id = resp.json()["id"]
    client.put(f"{API}/invoices/{invoice_id}", json={"status": "paid"}, headers=headers)

    resp = client.delete(f"{API}/invoices/{invoice_id}", headers=headers)
    assert resp.status_code == 400


def test_cash_flow_forecast_includes_pending_invoices(client: TestClient):
    token = _register_and_login(client, "invforecast", "invforecast@example.com")
    headers = _auth_headers(token)
    customer_id = _create_customer(client, headers)

    due_soon = (date.today() + timedelta(days=5)).isoformat()
    due_far = (date.today() + timedelta(days=90)).isoformat()

    client.post(f"{API}/invoices/", json={
        "customer_id": customer_id, "amount": "4000000",
        "issue_date": date.today().isoformat(), "due_date": due_soon,
    }, headers=headers)
    # Outside the 30-day window — should not appear.
    client.post(f"{API}/invoices/", json={
        "customer_id": customer_id, "amount": "9000000",
        "issue_date": date.today().isoformat(), "due_date": due_far,
    }, headers=headers)

    resp = client.get(f"{API}/invoices/cash-flow-forecast?days=30", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["events"]) == 1
    assert data["total_inflow"] == 4000000.0


def test_dashboard_cash_flow_forecast_combines_checks_and_invoices(client: TestClient):
    token = _register_and_login(client, "dashforecast", "dashforecast@example.com")
    headers = _auth_headers(token)
    customer_id = _create_customer(client, headers)

    businesses = client.get(f"{API}/businesses/", headers=headers).json()
    business_id = businesses[0]["id"]
    account_id = client.post(f"{API}/accounts/", json={
        "business_id": business_id, "name": "حساب", "account_type": "checking",
    }, headers=headers).json()["id"]

    due_soon = (date.today() + timedelta(days=5)).isoformat()
    client.post(f"{API}/invoices/", json={
        "customer_id": customer_id, "amount": "4000000",
        "issue_date": date.today().isoformat(), "due_date": due_soon,
    }, headers=headers)
    client.post(f"{API}/checks/", json={
        "account_id": account_id, "direction": "issued",
        "counterparty_name": "تامین‌کننده", "amount": "1000000", "due_date": due_soon,
    }, headers=headers)

    resp = client.get(f"{API}/dashboard/cash-flow-forecast?days=30", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    # 4,000,000 invoice inflow - 1,000,000 cheque outflow = 3,000,000 known net.
    assert data["known_events_net"] == 3000000.0
    assert data["projected_balance"] == data["current_balance"] + data["projected_net"]


def test_cash_flow_alert_fires_when_projection_negative(client: TestClient):
    token = _register_and_login(client, "alertuser", "alertuser@example.com")
    headers = _auth_headers(token)

    businesses = client.get(f"{API}/businesses/", headers=headers).json()
    business_id = businesses[0]["id"]
    account_id = client.post(f"{API}/accounts/", json={
        "business_id": business_id, "name": "حساب", "account_type": "checking",
    }, headers=headers).json()["id"]

    # No balance, plus a large pending outflow cheque -> projected balance goes negative.
    client.post(f"{API}/checks/", json={
        "account_id": account_id, "direction": "issued",
        "counterparty_name": "تامین‌کننده بزرگ", "amount": "50000000",
        "due_date": (date.today() + timedelta(days=5)).isoformat(),
    }, headers=headers)

    resp = client.get(f"{API}/alerts/cash-flow?days=30", headers=headers)
    assert resp.status_code == 200
    alerts = resp.json()
    assert len(alerts) == 1
    assert alerts[0]["type"] == "cash_flow_risk"
    assert alerts[0]["projected_balance"] < 0
