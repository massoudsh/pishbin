"""
Transaction schemas for request/response validation.
"""
from pydantic import BaseModel, condecimal, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.transaction import TransactionType

Money = condecimal(max_digits=10, decimal_places=2)
PositiveMoney = condecimal(gt=0, max_digits=10, decimal_places=2)


class TransactionBase(BaseModel):
    """Base transaction schema."""
    account_id: int
    category_id: Optional[int] = None
    amount: Money
    transaction_type: TransactionType
    description: Optional[str] = None
    date: datetime
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    """Schema for transaction creation."""
    amount: PositiveMoney


class TransactionUpdate(BaseModel):
    """Schema for transaction update."""
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    amount: Optional[PositiveMoney] = None
    transaction_type: Optional[TransactionType] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None

    @field_validator('account_id', 'amount', 'transaction_type', 'date', mode='before')
    @classmethod
    def reject_null_required_fields(cls, value):
        if value is None:
            raise ValueError('This field cannot be null')
        return value


class TransactionInDB(TransactionBase):
    """Transaction schema with database fields."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Transaction(TransactionInDB):
    """Transaction response schema."""
    pass

