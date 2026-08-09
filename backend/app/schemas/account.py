"""
Account schemas for request/response validation.
"""
from pydantic import BaseModel, Field, condecimal
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.account import AccountType

Money = condecimal(max_digits=10, decimal_places=2)


class AccountBase(BaseModel):
    """Base account schema."""
    business_id: int
    name: str = Field(..., min_length=1, max_length=100)
    account_type: AccountType
    balance: Money = Decimal("0.00")
    currency: str = Field(default="USD", max_length=3)
    description: Optional[str] = None


class AccountCreate(AccountBase):
    """Schema for account creation."""
    pass


class AccountUpdate(BaseModel):
    """Schema for account update."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    account_type: Optional[AccountType] = None
    balance: Optional[Money] = None
    currency: Optional[str] = Field(None, max_length=3)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AccountInDB(AccountBase):
    """Account schema with database fields."""
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Account(AccountInDB):
    """Account response schema."""
    pass

