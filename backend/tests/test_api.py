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


def test_transaction_invalid_amounts_and_null_updates_do_not_change_ledger(client: TestClient):
    from decimal import Decimal
    from uuid import uuid4
    from .test_business_api import _register_and_login, _auth_headers

    name = f"ledger{uuid4().hex[:12]}"
    headers = _auth_headers(_register_and_login(client, name, f"{name}@example.com"))
    business_id = client.get('/api/v1/businesses/', headers=headers).json()[0]['id']
    account_response = client.post('/api/v1/accounts/', headers=headers, json={
        'business_id': business_id, 'name': 'Cash', 'account_type': 'checking', 'currency': 'IRT', 'balance': '1000',
    })
    assert account_response.status_code == 201
    account_id = account_response.json()['id']
    payload = {'account_id': account_id, 'amount': '100', 'transaction_type': 'expense', 'date': '2026-10-30T12:00:00Z'}
    for amount in ['-100', '0', '0.001', '100000000', None]:
        response = client.post('/api/v1/transactions/', headers=headers, json={**payload, 'amount': amount})
        assert response.status_code == 422, response.text
    assert client.get('/api/v1/transactions/', headers=headers).json() == []
    assert Decimal(client.get(f'/api/v1/accounts/{account_id}', headers=headers).json()['balance']) == 1000

    response = client.post('/api/v1/transactions/', headers=headers, json=payload)
    assert response.status_code == 201, response.text
    transaction_id = response.json()['id']
    for update in [{'amount': '-100'}, {'amount': 0}, {'amount': None}, {'account_id': None}, {'transaction_type': None}, {'date': None}]:
        response = client.put(f'/api/v1/transactions/{transaction_id}', headers=headers, json=update)
        assert response.status_code == 422, response.text
    assert Decimal(client.get(f'/api/v1/accounts/{account_id}', headers=headers).json()['balance']) == 900
    assert Decimal(client.get(f'/api/v1/transactions/{transaction_id}', headers=headers).json()['amount']) == 100
    response = client.put(f'/api/v1/transactions/{transaction_id}', headers=headers, json={'amount': '150', 'description': None, 'category_id': None})
    assert response.status_code == 200, response.text
    assert Decimal(client.get(f'/api/v1/accounts/{account_id}', headers=headers).json()['balance']) == 850
