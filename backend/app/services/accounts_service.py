"""
Accounts service for business logic.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
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
    ) -> List[Account]:
        """Get all accounts for a user, optionally filtered by business."""
        query = self.db.query(Account).filter(Account.user_id == user_id)
        if business_id is not None:
            query = query.filter(Account.business_id == business_id)
        return query.offset(skip).limit(limit).all()
    
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
    
    def update_account(
        self,
        account_id: int,
        account_data: AccountUpdate,
        user_id: int
    ) -> Optional[Account]:
        """Update an existing account."""
        account = self.get_account(account_id, user_id)
        if not account:
            return None
        
        update_data = account_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(account, field, value)
        
        self.db.commit()
        self.db.refresh(account)
        return account
    
    def delete_account(self, account_id: int, user_id: int) -> bool:
        """Delete an account."""
        account = self.get_account(account_id, user_id)
        if not account:
            return False
        
        self.db.delete(account)
        self.db.commit()
        return True

