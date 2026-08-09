"""
Bank statement reconciliation service.

Matches rows from an uploaded bank statement against already-recorded
transactions (by account + amount + type, within a date window), similar
in spirit to TransactionsService.check_possible_duplicate but used for
read-only reporting rather than duplicate prevention on create.
"""
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.models.account import Account
from app.models.transaction import Transaction, TransactionType
from app.schemas.reconciliation import ReconciliationMatch, ReconciliationResult, ReconciliationUnmatched


class ReconciliationService:
    """Service for reconciling bank statement rows against recorded transactions."""

    def __init__(self, db: Session):
        self.db = db

    def _parse_row(self, row: Dict[str, Any], index: int) -> Dict[str, Any]:
        """Parse and validate one raw statement row. Raises ValueError with a human-readable message."""
        date_val = row.get("date")
        amount_val = row.get("amount")
        type_val = (row.get("type") or "").strip().lower()
        description = (row.get("description") or "").strip() or None

        if not date_val or amount_val is None or amount_val == "":
            raise ValueError(f"Row {index + 1}: missing date or amount")
        if type_val not in ("income", "expense"):
            raise ValueError(f"Row {index + 1}: type must be 'income' or 'expense'")

        if isinstance(date_val, str):
            try:
                dt = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
            except ValueError:
                try:
                    dt = datetime.strptime(date_val.strip()[:10], "%Y-%m-%d")
                except ValueError:
                    raise ValueError(f"Row {index + 1}: unrecognized date format '{date_val}'")
        else:
            dt = date_val

        try:
            amount = Decimal(str(amount_val))
        except InvalidOperation:
            raise ValueError(f"Row {index + 1}: invalid amount '{amount_val}'")

        return {
            "index": index,
            "date": dt,
            "amount": amount,
            "type": TransactionType.INCOME if type_val == "income" else TransactionType.EXPENSE,
            "description": description,
        }

    def reconcile(
        self,
        user_id: int,
        account_id: int,
        rows: List[Dict[str, Any]],
        window_days: int = 3,
    ) -> ReconciliationResult:
        """Reconcile bank statement rows against the account's recorded transactions."""
        account = self.db.query(Account).filter(
            Account.id == account_id,
            Account.user_id == user_id,
        ).first()
        if not account:
            raise ValueError("Account not found")

        parsed_rows = []
        row_errors: List[str] = []
        for i, row in enumerate(rows):
            try:
                parsed_rows.append(self._parse_row(row, i))
            except ValueError as e:
                row_errors.append(str(e))

        if not parsed_rows:
            return ReconciliationResult(
                account_id=account_id, total_rows=len(rows),
                matched_count=0, unmatched_count=0, matches=[], unmatched=[],
                row_errors=row_errors,
            )

        window = timedelta(days=window_days)
        earliest = min(r["date"] for r in parsed_rows) - window
        latest = max(r["date"] for r in parsed_rows) + window

        candidates = (
            self.db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.account_id == account_id,
                Transaction.date >= earliest,
                Transaction.date <= latest,
            )
            .order_by(Transaction.date.asc())
            .all()
        )

        used_transaction_ids: set = set()
        matches: List[ReconciliationMatch] = []
        unmatched: List[ReconciliationUnmatched] = []

        for r in parsed_rows:
            best = None
            best_diff = None
            for tx in candidates:
                if tx.id in used_transaction_ids:
                    continue
                if tx.transaction_type != r["type"]:
                    continue
                if Decimal(str(tx.amount)) != r["amount"]:
                    continue
                diff = abs((tx.date - r["date"]).total_seconds())
                if diff > window.total_seconds():
                    continue
                if best is None or diff < best_diff:
                    best, best_diff = tx, diff

            if best:
                used_transaction_ids.add(best.id)
                matches.append(ReconciliationMatch(
                    row_index=r["index"],
                    statement_date=r["date"],
                    statement_amount=r["amount"],
                    statement_description=r["description"],
                    transaction_id=best.id,
                    transaction_date=best.date,
                ))
            else:
                unmatched.append(ReconciliationUnmatched(
                    row_index=r["index"],
                    statement_date=r["date"],
                    statement_amount=r["amount"],
                    statement_type=r["type"].value,
                    statement_description=r["description"],
                    reason=f"No recorded transaction with matching amount/type within {window_days} day(s)",
                ))

        return ReconciliationResult(
            account_id=account_id,
            total_rows=len(rows),
            matched_count=len(matches),
            unmatched_count=len(unmatched),
            matches=matches,
            unmatched=unmatched,
            row_errors=row_errors,
        )
