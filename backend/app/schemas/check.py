"""Check (cheque) schemas for request/response validation."""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, condecimal, field_serializer

from app.models.check import CheckDirection, CheckStatus


DocumentAmount = condecimal(gt=0, max_digits=14, decimal_places=0)


class CheckBase(BaseModel):
    account_id: int
    customer_id: Optional[int] = None
    direction: CheckDirection
    counterparty_name: str = Field(..., min_length=1, max_length=200)
    amount: DocumentAmount
    bank_name: Optional[str] = Field(None, max_length=100)
    check_number: Optional[str] = Field(None, max_length=50)
    sayad_id: Optional[str] = Field(None, min_length=16, max_length=16)
    due_date: date
    description: Optional[str] = None


class CheckCreate(CheckBase):
    pass


class CheckUpdate(BaseModel):
    account_id: Optional[int] = None
    customer_id: Optional[int] = None
    direction: Optional[CheckDirection] = None
    counterparty_name: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[DocumentAmount] = None
    bank_name: Optional[str] = Field(None, max_length=100)
    check_number: Optional[str] = Field(None, max_length=50)
    sayad_id: Optional[str] = Field(None, min_length=16, max_length=16)
    due_date: Optional[date] = None
    status: Optional[CheckStatus] = None
    description: Optional[str] = None


class CheckSettlement(BaseModel):
    settlement_date: date
    transaction_id: Optional[int] = Field(default=None, gt=0)


class CheckOut(CheckBase):
    settlement_transaction_id: Optional[int] = None
    id: int
    user_id: int
    status: CheckStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, v: Optional[datetime]) -> Optional[str]:
        return v.isoformat() if v else None

    class Config:
        from_attributes = True
