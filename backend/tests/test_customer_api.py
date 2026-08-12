"""
Customer API tests using FastAPI TestClient (issue #50).
"""
from datetime import date, timedelta

from fastapi.testclient import TestClient

API = "/api/v1"


def _register_and_login(client: TestClient, username: str, email: str) -> str:
    client.post(f"{API}/auth/register", json={
        "email": email,
        "username": username,
        "password": "Password123",
        "full_name": "Customer Owner",
    })
    resp = client.post(
        f"{API}/auth/login",
        data={"username": username, "password": "Password123"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_customer(client: TestClient):
    token = _register_and_login(client, "custuser", "cust@example.com")
    headers = _auth_headers(token)

    resp = client.post(f"{API}/customers/", json={"name": "شرکت الف", "phone": "09120000000"}, headers=headers)
    assert resp.status_code == 201, resp.text
    customer = resp.json()
    assert customer["name"] == "شرکت الف"

    resp = client.get(f"{API}/customers/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_customer_requires_ownership(client: TestClient):
    token = _register_and_login(client, "custowner", "custowner@example.com")
    headers = _auth_headers(token)
    resp = client.post(f"{API}/customers/", json={"name": "شرکت الف"}, headers=headers)
    customer_id = resp.json()["id"]

    other_token = _register_and_login(client, "custintruder", "custintruder@example.com")
    other_headers = _auth_headers(other_token)
    resp = client.get(f"{API}/customers/{customer_id}", headers=other_headers)
    assert resp.status_code == 404


def test_customer_score_reflects_late_invoices_and_bounced_checks(client: TestClient):
    token = _register_and_login(client, "custscore", "custscore@example.com")
    headers = _auth_headers(token)

    customer_id = client.post(f"{API}/customers/", json={"name": "مشتری دیرکرد"}, headers=headers).json()["id"]

    businesses = client.get(f"{API}/businesses/", headers=headers).json()
    business_id = businesses[0]["id"]
    account_id = client.post(f"{API}/accounts/", json={
        "business_id": business_id, "name": "حساب", "account_type": "checking",
    }, headers=headers).json()["id"]

    # Paid invoice, 5 days late.
    due = (date.today() - timedelta(days=10)).isoformat()
    inv_resp = client.post(f"{API}/invoices/", json={
        "customer_id": customer_id,
        "amount": "1000000",
        "issue_date": (date.today() - timedelta(days=20)).isoformat(),
        "due_date": due,
    }, headers=headers)
    assert inv_resp.status_code == 201, inv_resp.text
    invoice_id = inv_resp.json()["id"]
    paid_date = (date.today() - timedelta(days=5)).isoformat()
    resp = client.put(f"{API}/invoices/{invoice_id}", json={"status": "paid", "paid_date": paid_date}, headers=headers)
    assert resp.status_code == 200, resp.text

    # One bounced check, one cleared check, both received from this customer.
    client.post(f"{API}/checks/", json={
        "account_id": account_id, "customer_id": customer_id, "direction": "received",
        "counterparty_name": "مشتری دیرکرد", "amount": "500000", "due_date": date.today().isoformat(),
    }, headers=headers)
    bounced_id = client.post(f"{API}/checks/", json={
        "account_id": account_id, "customer_id": customer_id, "direction": "received",
        "counterparty_name": "مشتری دیرکرد", "amount": "300000", "due_date": date.today().isoformat(),
    }, headers=headers).json()["id"]
    client.put(f"{API}/checks/{bounced_id}", json={"status": "bounced"}, headers=headers)

    resp = client.get(f"{API}/customers/{customer_id}/score", headers=headers)
    assert resp.status_code == 200, resp.text
    score = resp.json()
    assert score["paid_invoices"] == 1
    assert score["avg_days_late"] == 5.0
    assert score["total_checks"] == 2
    assert score["bounced_checks"] == 1
    assert score["bounced_check_rate"] == 0.5
