"""
Accounts service for business logic.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.models.check import Check
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate


class AccountsService:
    """Service for account operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_accounts(
        self,
        user_id: int,
        business_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
        after_id: Optional[int] = None,
    ) -> List[Account]:
        """Get all accounts for a user, optionally filtered by business."""
        query = self.db.query(Account).filter(Account.user_id == user_id)
        if business_id is not None:
            query = query.filter(Account.business_id == business_id)
        if after_id is not None:
            query = query.filter(Account.id > after_id)
        return query.order_by(Account.id).offset(skip).limit(limit).all()
    
    def get_account(self, account_id: int, user_id: int) -> Optional[Account]:
        """Get a specific account by ID."""
        return self.db.query(Account).filter(
            Account.id == account_id,
            Account.user_id == user_id
        ).first()
    
    def create_account(self, account_data: AccountCreate, user_id: int) -> Account:
        """Create a new account."""
        db_account = Account(
            **account_data.model_dump(),
            user_id=user_id
        )
        self.db.add(db_account)
        self.db.commit()
        self.db.refresh(db_account)
        return db_account
    
    def _has_settlements(self, account_id: int) -> bool:
        return self.db.query(Transaction.id).filter(
            Transaction.account_id == account_id,
            or_(Transaction.id.in_(self.db.query(Invoice.settlement_transaction_id)),
                Transaction.id.in_(self.db.query(Check.settlement_transaction_id))),
        ).first() is not None

    def update_account(
        self,
        account_id: int,
        account_data: AccountUpdate,
        user_id: int
    ) -> Optional[Account]:
        """Update an existing account."""
        account = self.db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).populate_existing().with_for_update().first()
        if not account:
            return None
        
        update_data = account_data.model_dump(exclude_unset=True)
        if self._has_settlements(account_id) and any(field in update_data and update_data[field] != getattr(account, field) for field in ("balance", "currency", "account_type")):
            raise ValueError("Accounts with settlements cannot have their balance, currency or type overwritten")
        for field, value in update_data.items():
            setattr(account, field, value)
        
        self.db.commit()
        self.db.refresh(account)
        return account
    
    def delete_account(self, account_id: int, user_id: int) -> bool:
        """Delete an account."""
        account = self.db.query(Account).filter(Account.id == account_id, Account.user_id == user_id).populate_existing().with_for_update().first()
        if not account:
            return False
        
        if self._has_settlements(account_id):
            raise ValueError("Accounts with settlement history cannot be deleted")
        self.db.delete(account)
        self.db.commit()
        return True

