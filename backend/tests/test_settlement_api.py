from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest

from .test_invoice_api import _register_and_login, _auth_headers

API = "/api/v1"


@pytest.fixture
def ledger(client):
    name = f"settle{uuid4().hex[:10]}"
    headers = _auth_headers(_register_and_login(client, name, f"{name}@example.com"))
    business = client.get(f"{API}/businesses/", headers=headers).json()[0]["id"]
    account = client.post(f"{API}/accounts/", headers=headers, json={
        "business_id": business, "name": "Cash", "account_type": "checking", "currency": "IRT", "balance": "1000",
    }).json()["id"]
    customer = client.post(f"{API}/customers/", headers=headers, json={"name": "Buyer"}).json()["id"]
    return headers, account, customer


def document(client, ledger, kind="invoice", amount="200"):
    headers, account, customer = ledger
    today = date.today().isoformat()
    if kind == "invoice":
        response = client.post(f"{API}/invoices/", headers=headers, json={
            "customer_id": customer, "amount": amount, "issue_date": today, "due_date": today,
        })
    else:
        response = client.post(f"{API}/checks/", headers=headers, json={
            "account_id": account, "customer_id": customer, "direction": kind, "counterparty_name": "Party", "amount": amount, "due_date": today,
        })
    assert response.status_code == 201, response.text
    return response.json()["id"]


def settle(client, ledger, doc_id, kind="invoice", **overrides):
    headers, account, _ = ledger
    data = {"settlement_date": date.today().isoformat()}
    if kind == "invoice":
        data["account_id"] = account
    data.update(overrides)
    return client.post(f"{API}/{'invoices' if kind == 'invoice' else 'checks'}/{doc_id}/settle", headers=headers, json=data)


def balance(client, ledger):
    headers, account, _ = ledger
    return Decimal(client.get(f"{API}/accounts/{account}", headers=headers).json()["balance"])


@pytest.mark.parametrize("kind,expected,transaction_type", [("invoice", "1200", "income"), ("received", "1200", "income"), ("issued", "800", "expense")])
def test_settlement_posts_once_and_locks_history(client, ledger, kind, expected, transaction_type):
    headers, account, customer = ledger
    doc_id = document(client, ledger, kind)
    response = settle(client, ledger, doc_id, kind)
    assert response.status_code == 200, response.text
    transaction_id = response.json()["settlement_transaction_id"]
    assert transaction_id is not None
    assert response.json()["status"] == ("paid" if kind == "invoice" else "cleared")
    assert balance(client, ledger) == Decimal(expected)
    replay = settle(client, ledger, doc_id, kind)
    assert replay.status_code == 200
    assert replay.json()["settlement_transaction_id"] == transaction_id
    assert balance(client, ledger) == Decimal(expected)
    transactions = client.get(f"{API}/transactions/", headers=headers).json()
    assert len(transactions) == 1
    assert transactions[0]["transaction_type"] == transaction_type
    assert Decimal(str(transactions[0]["amount"])) == 200
    assert client.put(f"{API}/transactions/{transaction_id}", headers=headers, json={"amount": 300}).status_code == 409
    assert client.delete(f"{API}/transactions/{transaction_id}", headers=headers).status_code == 409
    path = f"{API}/{'invoices' if kind == 'invoice' else 'checks'}/{doc_id}"
    assert client.put(path, headers=headers, json={"status": "issued" if kind == "invoice" else "pending"}).status_code == 409
    assert client.delete(path, headers=headers).status_code == 400
    assert client.delete(f"{API}/accounts/{account}", headers=headers).status_code == 409
    assert client.put(f"{API}/accounts/{account}", headers=headers, json={"currency": "USD"}).status_code == 409
    assert client.put(f"{API}/accounts/{account}", headers=headers, json={"balance": 0}).status_code == 409
    if kind == "invoice":
        assert client.delete(f"{API}/customers/{customer}", headers=headers).status_code == 409
    assert balance(client, ledger) == Decimal(expected)


@pytest.mark.parametrize("kind", ["invoice", "received", "issued"])
def test_existing_transaction_link_does_not_change_balance_and_cannot_be_reused(client, ledger, kind):
    headers, account, _ = ledger
    transaction = client.post(f"{API}/transactions/", headers=headers, json={
        "account_id": account, "amount": "200", "transaction_type": "expense" if kind == "issued" else "income",
        "date": f"{date.today().isoformat()}T12:00:00Z",
    })
    assert transaction.status_code == 201, transaction.text
    transaction_id = transaction.json()["id"]
    before = balance(client, ledger)
    first = document(client, ledger, kind)
    assert settle(client, ledger, first, kind, transaction_id=transaction_id).status_code == 200
    assert settle(client, ledger, first, kind, transaction_id=transaction_id).status_code == 200
    assert balance(client, ledger) == before
    second = document(client, ledger, kind)
    assert settle(client, ledger, second, kind, transaction_id=transaction_id).status_code == 409
    if kind != "issued":
        other_kind = "received" if kind == "invoice" else "invoice"
        other = document(client, ledger, other_kind)
        assert settle(client, ledger, other, other_kind, transaction_id=transaction_id).status_code == 409
    assert balance(client, ledger) == before
    assert len(client.get(f"{API}/transactions/", headers=headers).json()) == 1


@pytest.mark.parametrize("kind", ["invoice", "received"])
def test_status_only_bypass_is_blocked(client, ledger, kind):
    headers, _, _ = ledger
    doc_id = document(client, ledger, kind)
    path = f"{API}/{'invoices' if kind == 'invoice' else 'checks'}/{doc_id}"
    response = client.put(path, headers=headers, json={"status": "paid" if kind == "invoice" else "cleared"})
    assert response.status_code == 409
    assert balance(client, ledger) == Decimal(1000)
    assert client.get(f"{API}/transactions/", headers=headers).json() == []


@pytest.mark.parametrize("change", [{"currency": "IRR"}, {"is_active": False}, {"account_type": "investment"}])
def test_unsupported_accounts_fail_without_partial_posting(client, ledger, change):
    headers, account, _ = ledger
    doc_id = document(client, ledger)
    assert client.put(f"{API}/accounts/{account}", headers=headers, json=change).status_code == 200
    response = settle(client, ledger, doc_id)
    assert response.status_code == 409
    assert balance(client, ledger) == Decimal(1000)
    assert client.get(f"{API}/transactions/", headers=headers).json() == []
    assert client.get(f"{API}/invoices/{doc_id}", headers=headers).json()["status"] == "issued"


def test_invalid_dates_and_wrong_owner_do_not_post(client, ledger):
    headers, account, _ = ledger
    doc_id = document(client, ledger)
    for day in [date.today() + timedelta(days=1), date.today() - timedelta(days=1)]:
        assert settle(client, ledger, doc_id, settlement_date=day.isoformat()).status_code == 409
    assert settle(client, ledger, doc_id, settlement_date="not-a-date").status_code == 422
    name = f"other{uuid4().hex[:10]}"
    other = _auth_headers(_register_and_login(client, name, f"{name}@example.com"))
    assert client.post(f"{API}/invoices/{doc_id}/settle", headers=other, json={"account_id": account, "settlement_date": date.today().isoformat()}).status_code == 404
    business = client.get(f"{API}/businesses/", headers=other).json()[0]["id"]
    foreign_account = client.post(f"{API}/accounts/", headers=other, json={"business_id": business, "name": "Foreign", "account_type": "checking", "currency": "IRT"}).json()["id"]
    assert settle(client, ledger, doc_id, account_id=foreign_account).status_code == 409
    assert balance(client, ledger) == Decimal(1000)


def test_mismatched_existing_transaction_and_replay_details_are_rejected(client, ledger):
    headers, account, _ = ledger
    doc_id = document(client, ledger)
    wrong = client.post(f"{API}/transactions/", headers=headers, json={"account_id": account, "amount": "100", "transaction_type": "income", "date": f"{date.today().isoformat()}T12:00:00Z"}).json()["id"]
    assert settle(client, ledger, doc_id, transaction_id=wrong).status_code == 409
    assert settle(client, ledger, doc_id).status_code == 200
    assert settle(client, ledger, doc_id, transaction_id=wrong).status_code == 409
    assert settle(client, ledger, doc_id, settlement_date=(date.today() - timedelta(days=1)).isoformat()).status_code == 409
    assert balance(client, ledger) == Decimal(1300)


@pytest.mark.parametrize("kind", ["invoice", "received"])
def test_historical_terminal_records_are_not_automatically_posted(client, ledger, kind):
    from app.db.session import SessionLocal
    from app.models.invoice import Invoice, InvoiceStatus
    from app.models.check import Check, CheckStatus
    headers, _, _ = ledger
    doc_id = document(client, ledger, kind)
    with SessionLocal() as db:
        doc = db.get(Invoice if kind == "invoice" else Check, doc_id)
        doc.status = InvoiceStatus.PAID if kind == "invoice" else CheckStatus.CLEARED
        db.commit()
    assert settle(client, ledger, doc_id, kind).status_code == 409
    assert balance(client, ledger) == Decimal(1000)
    assert client.get(f"{API}/transactions/", headers=headers).json() == []


def test_ledger_overflow_and_cancelled_invoice_do_not_post(client, ledger):
    headers, _, _ = ledger
    large = document(client, ledger, amount="100000000")
    assert settle(client, ledger, large).status_code == 409
    cancelled = document(client, ledger)
    assert client.put(f"{API}/invoices/{cancelled}", headers=headers, json={"status": "cancelled"}).status_code == 200
    assert settle(client, ledger, cancelled).status_code == 409
    assert balance(client, ledger) == Decimal(1000)
    assert client.get(f"{API}/transactions/", headers=headers).json() == []


def test_commit_failure_rolls_back_status_balance_and_transaction(client, ledger, monkeypatch):
    from sqlalchemy.orm import Session
    from app.models.invoice import Invoice
    headers, _, _ = ledger
    doc_id = document(client, ledger)
    original_commit = Session.commit

    def failing_commit(db):
        if any(isinstance(item, Invoice) and item.settlement_transaction_id for item in db.dirty):
            raise RuntimeError("Simulated commit failure")
        return original_commit(db)

    with monkeypatch.context() as patch:
        patch.setattr(Session, "commit", failing_commit)
        with pytest.raises(RuntimeError, match="Simulated commit failure"):
            settle(client, ledger, doc_id)
    assert balance(client, ledger) == Decimal(1000)
    assert client.get(f"{API}/transactions/", headers=headers).json() == []
    assert client.get(f"{API}/invoices/{doc_id}", headers=headers).json()["status"] == "issued"


def test_bounced_checks_can_be_settled_but_voided_checks_cannot(client, ledger):
    headers, _, _ = ledger
    bounced = document(client, ledger, "received")
    assert client.put(f"{API}/checks/{bounced}", headers=headers, json={"status": "bounced"}).status_code == 200
    assert settle(client, ledger, bounced, "received").status_code == 200
    voided = document(client, ledger, "issued")
    assert client.put(f"{API}/checks/{voided}", headers=headers, json={"status": "voided"}).status_code == 200
    assert settle(client, ledger, voided, "issued").status_code == 409
    assert balance(client, ledger) == Decimal(1200)


def test_document_amount_precision_is_validated_before_storage():
    from pydantic import ValidationError
    from app.schemas.invoice import InvoiceUpdate
    from app.schemas.check import CheckUpdate
    for schema in (InvoiceUpdate, CheckUpdate):
        for amount in ["0", "-1", "200.5", "100000000000000"]:
            with pytest.raises(ValidationError):
                schema(amount=amount)


def test_transaction_dates_use_the_tehran_calendar_day():
    from datetime import datetime, timezone
    from app.models.transaction import Transaction
    from app.services.settlement_service import SettlementService
    timestamp = datetime(2026, 10, 29, 22, 0, tzinfo=timezone.utc)
    assert SettlementService._transaction_day(Transaction(date=timestamp)) == date(2026, 10, 30)
    assert SettlementService._transaction_day(Transaction(date=timestamp.replace(tzinfo=None))) == date(2026, 10, 30)
