"""
Transactions service for business logic.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.transaction import Transaction, TransactionType
from app.models.account import Account
from app.models.invoice import Invoice
from app.models.check import Check
from app.schemas.transaction import TransactionCreate, TransactionUpdate
from decimal import Decimal


class TransactionsService:
    """Service for transaction operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_transactions(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        account_id: Optional[int] = None,
        category_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        q: Optional[str] = None,
        amount_min: Optional[float] = None,
        amount_max: Optional[float] = None,
    ) -> List[Transaction]:
        """Get all transactions for a user with optional filters and search."""
        query = self.db.query(Transaction).filter(Transaction.user_id == user_id)
        if account_id:
            query = query.filter(Transaction.account_id == account_id)
        if category_id:
            query = query.filter(Transaction.category_id == category_id)
        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)
        if q and q.strip():
            search = f"%{q.strip()}%"
            query = query.filter(Transaction.description.ilike(search))
        if amount_min is not None:
            query = query.filter(Transaction.amount >= amount_min)
        if amount_max is not None:
            query = query.filter(Transaction.amount <= amount_max)
        return query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    
    def get_transaction(self, transaction_id: int, user_id: int) -> Optional[Transaction]:
        """Get a specific transaction by ID."""
        return self.db.query(Transaction).filter(
            Transaction.id == transaction_id,
            Transaction.user_id == user_id
        ).first()
    
    def check_possible_duplicate(
        self,
        user_id: int,
        account_id: int,
        amount: Decimal,
        transaction_date: datetime,
        window_hours: int = 24,
    ) -> Optional[Transaction]:
        """Return an existing transaction if same account, amount, and date within window."""
        from datetime import timedelta
        start = transaction_date - timedelta(hours=window_hours)
        end = transaction_date + timedelta(hours=window_hours)
        return (
            self.db.query(Transaction)
            .filter(
                Transaction.user_id == user_id,
                Transaction.account_id == account_id,
                Transaction.amount == amount,
                Transaction.date >= start,
                Transaction.date <= end,
            )
            .first()
        )

    def create_transaction(
        self,
        transaction_data: TransactionCreate,
        user_id: int,
        skip_duplicate_check: bool = False,
    ) -> Transaction:
        """Create a new transaction and update account balance."""
        # Verify account belongs to user
        account = self.db.query(Account).filter(
            Account.id == transaction_data.account_id,
            Account.user_id == user_id
        ).populate_existing().with_for_update().first()
        if not account:
            raise ValueError("Account not found")
        amount = Decimal(str(transaction_data.amount))
        if not skip_duplicate_check:
            existing = self.check_possible_duplicate(
                user_id,
                transaction_data.account_id,
                amount,
                transaction_data.date,
            )
            if existing:
                raise ValueError("POSSIBLE_DUPLICATE", existing.id, existing.date.isoformat() if hasattr(existing.date, "isoformat") else str(existing.date))
        db_transaction = Transaction(
            **transaction_data.model_dump(),
            user_id=user_id
        )
        
        # Update account balance
        if transaction_data.transaction_type.value == "income":
            account.balance += amount
        elif transaction_data.transaction_type.value == "expense":
            account.balance -= amount
        
        self.db.add(db_transaction)
        self.db.commit()
        self.db.refresh(db_transaction)
        return db_transaction
    
    def _ensure_not_settlement(self, transaction_id: int) -> None:
        if self.db.query(Invoice.id).filter(Invoice.settlement_transaction_id == transaction_id).first() or self.db.query(Check.id).filter(Check.settlement_transaction_id == transaction_id).first():
            raise ValueError("Settlement transactions cannot be edited or deleted")

    def update_transaction(
        self,
        transaction_id: int,
        transaction_data: TransactionUpdate,
        user_id: int
    ) -> Optional[Transaction]:
        """Update an existing transaction."""
        transaction = self.db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == user_id).populate_existing().with_for_update().first()
        if not transaction:
            return None
        self._ensure_not_settlement(transaction_id)

        # Capture old values before any mutation
        old_amount = Decimal(str(transaction.amount))
        old_type = transaction.transaction_type
        old_account_id = transaction.account_id

        update_data = transaction_data.model_dump(exclude_unset=True)

        new_account_id = update_data.get("account_id", old_account_id)
        new_amount = Decimal(str(update_data.get("amount", old_amount)))
        raw_new_type = update_data.get("transaction_type", old_type)
        from app.models.transaction import TransactionType as TT
        new_type = TT(raw_new_type) if isinstance(raw_new_type, str) else raw_new_type

        # Apply field updates to the transaction row
        for field, value in update_data.items():
            setattr(transaction, field, value)

        # Revert old impact from the old account
        old_account = self.db.query(Account).filter(Account.id == old_account_id).populate_existing().with_for_update().first()
        if old_account:
            if old_type.value == "income":
                old_account.balance -= old_amount
            elif old_type.value == "expense":
                old_account.balance += old_amount

        # Apply new impact to the (possibly different) new account
        if new_account_id != old_account_id:
            new_account = self.db.query(Account).filter(
                Account.id == new_account_id,
                Account.user_id == user_id,
            ).populate_existing().with_for_update().first()
            if not new_account:
                self.db.rollback()
                raise ValueError("New account not found")
        else:
            new_account = old_account

        if new_account:
            if new_type.value == "income":
                new_account.balance += new_amount
            elif new_type.value == "expense":
                new_account.balance -= new_amount

        self.db.commit()
        self.db.refresh(transaction)
        return transaction
    
    def delete_transaction(self, transaction_id: int, user_id: int) -> bool:
        """Delete a transaction and update account balance."""
        transaction = self.db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.user_id == user_id).populate_existing().with_for_update().first()
        if not transaction:
            return False
        self._ensure_not_settlement(transaction_id)

        # Revert balance change
        account = self.db.query(Account).filter(Account.id == transaction.account_id, Account.user_id == user_id).populate_existing().with_for_update().first()
        amount = Decimal(str(transaction.amount))
        if transaction.transaction_type.value == "income":
            account.balance -= amount
        elif transaction.transaction_type.value == "expense":
            account.balance += amount
        
        self.db.delete(transaction)
        self.db.commit()
        return True

    def import_from_rows(
        self,
        user_id: int,
        account_id: int,
        rows: List[Dict[str, Any]],
    ) -> tuple[int, list[str]]:
        """
        Create transactions from a list of row dicts (e.g. from CSV).
        Each row should have: date (str ISO or YYYY-MM-DD), amount (number), type (income|expense), description (optional).
        Returns (created_count, list of error messages for invalid rows).
        """
        account = self.db.query(Account).filter(
            Account.id == account_id,
            Account.user_id == user_id,
        ).first()
        if not account:
            raise ValueError("Account not found")
        created = 0
        errors: List[str] = []
        for i, row in enumerate(rows):
            try:
                date_val = row.get("date")
                amount_val = row.get("amount")
                type_val = row.get("type", "").strip().lower()
                description = (row.get("description") or "").strip() or None
                if not date_val or amount_val is None:
                    errors.append(f"Row {i + 1}: missing date or amount")
                    continue
                if type_val not in ("income", "expense"):
                    errors.append(f"Row {i + 1}: type must be 'income' or 'expense'")
                    continue
                if isinstance(date_val, str):
                    try:
                        dt = datetime.fromisoformat(date_val.replace("Z", "+00:00"))
                    except ValueError:
                        dt = datetime.strptime(date_val.strip()[:10], "%Y-%m-%d")
                else:
                    dt = date_val
                amount = Decimal(str(amount_val))
                tx_type = TransactionType.INCOME if type_val == "income" else TransactionType.EXPENSE
                create_data = TransactionCreate(
                    account_id=account_id,
                    category_id=None,
                    amount=amount,
                    transaction_type=tx_type,
                    description=description,
                    date=dt,
                    notes=None,
                )
                self.create_transaction(create_data, user_id)
                created += 1
            except Exception as e:
                errors.append(f"Row {i + 1}: {str(e)}")
        return created, errors

    def export_for_user(
        self,
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 10000,
    ) -> List[Dict[str, Any]]:
        """Return transactions as list of dicts for CSV export."""
        tx_list = self.get_user_transactions(
            user_id, skip=0, limit=limit,
            start_date=start_date, end_date=end_date,
        )
        return [
            {
                "id": t.id,
                "date": t.date.isoformat() if t.date else "",
                "amount": float(t.amount),
                "type": t.transaction_type.value,
                "description": t.description or "",
                "account_id": t.account_id,
                "category_id": t.category_id or "",
            }
            for t in tx_list
        ]

