"""Check (cheque) schemas for request/response validation."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_serializer

from app.models.check import CheckDirection, CheckStatus


class CheckBase(BaseModel):
    account_id: int
    direction: CheckDirection
    counterparty_name: str = Field(..., min_length=1, max_length=200)
    amount: Decimal = Field(..., gt=0)
    bank_name: Optional[str] = Field(None, max_length=100)
    check_number: Optional[str] = Field(None, max_length=50)
    sayad_id: Optional[str] = Field(None, min_length=16, max_length=16)
    due_date: date
    description: Optional[str] = None


class CheckCreate(CheckBase):
    pass


class CheckUpdate(BaseModel):
    account_id: Optional[int] = None
    direction: Optional[CheckDirection] = None
    counterparty_name: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[Decimal] = Field(None, gt=0)
    bank_name: Optional[str] = Field(None, max_length=100)
    check_number: Optional[str] = Field(None, max_length=50)
    sayad_id: Optional[str] = Field(None, min_length=16, max_length=16)
    due_date: Optional[date] = None
    status: Optional[CheckStatus] = None
    description: Optional[str] = None


class CheckOut(CheckBase):
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
