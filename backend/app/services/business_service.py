"""
Business service for multi-business/workspace management.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.business import Business
from app.models.account import Account
from app.schemas.business import BusinessCreate, BusinessUpdate


class BusinessService:
    """Service for business (workspace) operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_user_businesses(self, owner_id: int) -> List[Business]:
        """Get all businesses owned by a user."""
        return self.db.query(Business).filter(
            Business.owner_id == owner_id
        ).order_by(Business.is_default.desc(), Business.created_at.asc()).all()

    def get_business(self, business_id: int, owner_id: int) -> Optional[Business]:
        """Get a specific business by ID, scoped to owner."""
        return self.db.query(Business).filter(
            Business.id == business_id,
            Business.owner_id == owner_id
        ).first()

    def create_business(self, business_data: BusinessCreate, owner_id: int) -> Business:
        """Create a new business. The user's first business becomes the default."""
        has_any = self.db.query(Business).filter(Business.owner_id == owner_id).first() is not None
        db_business = Business(
            **business_data.model_dump(),
            owner_id=owner_id,
            is_default=not has_any,
        )
        self.db.add(db_business)
        self.db.commit()
        self.db.refresh(db_business)
        return db_business

    def update_business(
        self,
        business_id: int,
        business_data: BusinessUpdate,
        owner_id: int
    ) -> Optional[Business]:
        """Update an existing business."""
        business = self.get_business(business_id, owner_id)
        if not business:
            return None

        update_data = business_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(business, field, value)

        self.db.commit()
        self.db.refresh(business)
        return business

    def set_default_business(self, business_id: int, owner_id: int) -> Optional[Business]:
        """Mark a business as the default (switch active workspace)."""
        business = self.get_business(business_id, owner_id)
        if not business:
            return None

        self.db.query(Business).filter(
            Business.owner_id == owner_id,
            Business.id != business_id,
        ).update({"is_default": False})
        business.is_default = True

        self.db.commit()
        self.db.refresh(business)
        return business

    def delete_business(self, business_id: int, owner_id: int) -> tuple[bool, Optional[str]]:
        """
        Delete a business. Returns (success, error_message).
        Blocked if it's the user's only business, or if it still has accounts.
        """
        business = self.get_business(business_id, owner_id)
        if not business:
            return False, None

        total = self.db.query(Business).filter(Business.owner_id == owner_id).count()
        if total <= 1:
            return False, "Cannot delete the only business"

        has_accounts = self.db.query(Account).filter(Account.business_id == business_id).first() is not None
        if has_accounts:
            return False, "Cannot delete a business that still has accounts"

        was_default = business.is_default
        self.db.delete(business)
        self.db.commit()

        if was_default:
            fallback = self.db.query(Business).filter(Business.owner_id == owner_id).first()
            if fallback:
                fallback.is_default = True
                self.db.commit()

        return True, None
