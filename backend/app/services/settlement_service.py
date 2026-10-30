from datetime import date, datetime, time, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.check import Check, CheckDirection, CheckStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.transaction import Transaction, TransactionType


class SettlementService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _transaction_day(transaction: Transaction) -> date:
        timestamp = transaction.date
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        return timestamp.astimezone(ZoneInfo("Asia/Tehran")).date()

    def settle(self, model, document_id: int, user_id: int, settlement_date: date,
               account_id: int | None = None, transaction_id: int | None = None):
        document = self.db.query(model).filter(model.id == document_id, model.user_id == user_id).populate_existing().with_for_update().first()
        if not document:
            return None
        is_invoice = model is Invoice
        target = InvoiceStatus.PAID if is_invoice else CheckStatus.CLEARED
        if document.settlement_transaction_id:
            posted = self.db.get(Transaction, document.settlement_transaction_id)
            if (account_id is not None and posted.account_id != account_id) or (transaction_id is not None and posted.id != transaction_id) or self._transaction_day(posted) != settlement_date:
                raise ValueError("This document was already settled with different details")
            return document
        allowed = (InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE) if is_invoice else (CheckStatus.PENDING, CheckStatus.BOUNCED)
        if document.status not in allowed:
            raise ValueError("Only open documents can be settled; historical paid/cleared records require reconciliation")
        if settlement_date > datetime.now(ZoneInfo("Asia/Tehran")).date():
            raise ValueError("Settlement date cannot be in the future")
        if is_invoice and settlement_date < document.issue_date:
            raise ValueError("Settlement date cannot precede invoice issue date")
        account_id = account_id if is_invoice else document.account_id
        kind = TransactionType.INCOME if is_invoice or document.direction == CheckDirection.RECEIVED else TransactionType.EXPENSE
        amount = Decimal(document.amount)
        if amount <= 0 or amount != amount.to_integral_value():
            raise ValueError("Settlement requires a positive whole-toman document amount")
        transaction = None
        if transaction_id is not None:
            transaction = self.db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == user_id).populate_existing().with_for_update().first()
            if not transaction or transaction.account_id != account_id or transaction.transaction_type != kind or transaction.amount != amount or self._transaction_day(transaction) != settlement_date:
                raise ValueError("Existing transaction must match owner, account, amount, direction and settlement date")
            if self.db.query(Invoice.id).filter(Invoice.settlement_transaction_id == transaction_id).first() or self.db.query(Check.id).filter(Check.settlement_transaction_id == transaction_id).first():
                raise ValueError("This transaction is already linked to a settlement")
        account = self.db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).populate_existing().with_for_update().first()
        if not account or not account.is_active or account.currency != "IRT" or account.account_type.value not in ("checking", "savings", "other"):
            raise ValueError("Settlement requires an owned active cash account denominated in IRT")
        if transaction is None:
            delta = amount if kind == TransactionType.INCOME else -amount
            balance = Decimal(account.balance) + delta
            if amount > Decimal("99999999.99") or abs(balance) > Decimal("99999999.99"):
                raise ValueError("Settlement exceeds the supported ledger monetary range")
            transaction = Transaction(user_id=user_id, account_id=account_id, amount=amount,
                                      transaction_type=kind, date=datetime.combine(settlement_date, time(12), tzinfo=timezone.utc),
                                      description=f"Settlement {'invoice' if is_invoice else 'check'} #{document.id}")
            self.db.add(transaction)
            self.db.flush()
            account.balance = balance
        document.settlement_transaction_id = transaction.id
        document.status = target
        if is_invoice:
            document.paid_date = settlement_date
        self.db.commit()
        self.db.refresh(document)
        return document
