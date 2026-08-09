"""
Bank statement reconciliation API tests.
"""
import io
from datetime import date, timedelta

from fastapi.testclient import TestClient

API = "/api/v1"


def _register_and_login(client: TestClient, username: str, email: str) -> str:
    client.post(f"{API}/auth/register", json={
        "email": email,
        "username": username,
        "password": "Password123",
        "full_name": "Reconciler",
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
        "name": "حساب آشتی‌سازی",
        "account_type": "checking",
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _upload_csv(client: TestClient, headers: dict, account_id: int, csv_text: str, window_days: int = 3):
    files = {"file": ("statement.csv", io.BytesIO(csv_text.encode("utf-8")), "text/csv")}
    return client.post(
        f"{API}/reconciliation/bank-statement",
        params={"account_id": account_id, "window_days": window_days},
        files=files,
        headers=headers,
    )


def test_reconcile_matches_existing_transaction(client: TestClient):
    """A statement row with the same account/amount/type/date as a recorded transaction matches."""
    token = _register_and_login(client, "reconcileuser", "reconcile@example.com")
    headers = _auth_headers(token)
    account_id = _create_account(client, headers)

    tx_date = date.today().isoformat()
    resp = client.post(f"{API}/transactions/", json={
        "account_id": account_id,
        "amount": 1500000,
        "transaction_type": "expense",
        "description": "خرید تجهیزات",
        "date": f"{tx_date}T00:00:00",
    }, headers=headers)
    assert resp.status_code == 201, resp.text

    csv_text = f"date,amount,type,description\n{tx_date},1500000,expense,خرید تجهیزات از صورت‌حساب بانک\n"
    resp = _upload_csv(client, headers, account_id, csv_text)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total_rows"] == 1
    assert data["matched_count"] == 1
    assert data["unmatched_count"] == 0


def test_reconcile_matches_within_window_days(client: TestClient):
    """A statement row a couple of days off from the transaction date still matches within window_days."""
    token = _register_and_login(client, "reconcilewindow", "reconcilewindow@example.com")
    headers = _auth_headers(token)
    account_id = _create_account(client, headers)

    tx_date = date.today()
    resp = client.post(f"{API}/transactions/", json={
        "account_id": account_id,
        "amount": 800000,
        "transaction_type": "income",
        "description": "واریز مشتری",
        "date": f"{tx_date.isoformat()}T00:00:00",
    }, headers=headers)
    assert resp.status_code == 201, resp.text

    statement_date = (tx_date + timedelta(days=2)).isoformat()
    csv_text = f"date,amount,type,description\n{statement_date},800000,income,واریز\n"
    resp = _upload_csv(client, headers, account_id, csv_text, window_days=3)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["matched_count"] == 1


def test_reconcile_reports_unmatched_row(client: TestClient):
    """A statement row with no corresponding transaction is reported as unmatched."""
    token = _register_and_login(client, "reconcileunmatched", "reconcileunmatched@example.com")
    headers = _auth_headers(token)
    account_id = _create_account(client, headers)

    csv_text = f"date,amount,type,description\n{date.today().isoformat()},999000,expense,هزینه ناشناخته\n"
    resp = _upload_csv(client, headers, account_id, csv_text)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["matched_count"] == 0
    assert data["unmatched_count"] == 1
    assert data["unmatched"][0]["statement_amount"] == "999000"


def test_reconcile_requires_own_account(client: TestClient):
    """Reconciling against another user's account must fail with 404."""
    token = _register_and_login(client, "reconcileowner", "reconcileowner@example.com")
    headers = _auth_headers(token)
    account_id = _create_account(client, headers)

    other_token = _register_and_login(client, "reconcileintruder", "reconcileintruder@example.com")
    other_headers = _auth_headers(other_token)

    csv_text = f"date,amount,type,description\n{date.today().isoformat()},100000,expense,x\n"
    resp = _upload_csv(client, other_headers, account_id, csv_text)
    assert resp.status_code == 404


def test_reconcile_does_not_create_or_modify_transactions(client: TestClient):
    """Reconciliation is read-only: transaction count is unchanged after upload."""
    token = _register_and_login(client, "reconcilereadonly", "reconcilereadonly@example.com")
    headers = _auth_headers(token)
    account_id = _create_account(client, headers)

    csv_text = f"date,amount,type,description\n{date.today().isoformat()},250000,expense,چیزی\n"
    _upload_csv(client, headers, account_id, csv_text)

    resp = client.get(f"{API}/transactions/", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []
