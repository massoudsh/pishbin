"""
Check (cheque) service for issued/received cheque tracking.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.check import Check, CheckStatus
from app.models.account import Account
from app.schemas.check import CheckCreate, CheckUpdate


class CheckService:
    """Service for cheque operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_user_checks(
        self,
        user_id: int,
        status: Optional[CheckStatus] = None,
        account_id: Optional[int] = None,
    ) -> List[Check]:
        """List a user's cheques, optionally filtered by status/account, ordered by due date."""
        query = self.db.query(Check).filter(Check.user_id == user_id)
        if status is not None:
            query = query.filter(Check.status == status)
        if account_id is not None:
            query = query.filter(Check.account_id == account_id)
        return query.order_by(Check.due_date.asc()).all()

    def get_check(self, check_id: int, user_id: int) -> Optional[Check]:
        """Get a specific cheque by ID, scoped to owner."""
        return self.db.query(Check).filter(
            Check.id == check_id,
            Check.user_id == user_id,
        ).first()

    def create_check(self, check_data: CheckCreate, user_id: int) -> Optional[Check]:
        """Create a new cheque. Returns None if the account doesn't belong to the user."""
        account = self.db.query(Account).filter(
            Account.id == check_data.account_id,
            Account.user_id == user_id,
        ).first()
        if not account:
            return None

        db_check = Check(**check_data.model_dump(), user_id=user_id)
        self.db.add(db_check)
        self.db.commit()
        self.db.refresh(db_check)
        return db_check

    def update_check(
        self,
        check_id: int,
        check_data: CheckUpdate,
        user_id: int,
    ) -> Optional[Check]:
        """Update an existing cheque."""
        check = self.get_check(check_id, user_id)
        if not check:
            return None

        update_data = check_data.model_dump(exclude_unset=True)
        if "account_id" in update_data:
            account = self.db.query(Account).filter(
                Account.id == update_data["account_id"],
                Account.user_id == user_id,
            ).first()
            if not account:
                return None

        for field, value in update_data.items():
            setattr(check, field, value)

        self.db.commit()
        self.db.refresh(check)
        return check

    def delete_check(self, check_id: int, user_id: int) -> tuple[bool, Optional[str]]:
        """
        Delete a cheque. Returns (success, error_message).
        Blocked once a cheque has been cleared or bounced, to preserve the audit trail;
        void it instead via a status update.
        """
        check = self.get_check(check_id, user_id)
        if not check:
            return False, None

        if check.status in (CheckStatus.CLEARED, CheckStatus.BOUNCED):
            return False, "Cannot delete a cleared or bounced cheque; set status to voided instead"

        self.db.delete(check)
        self.db.commit()
        return True, None
