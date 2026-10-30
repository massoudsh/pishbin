"""Invoice schemas for request/response validation."""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, condecimal, field_serializer

from app.models.invoice import InvoiceStatus


DocumentAmount = condecimal(gt=0, max_digits=14, decimal_places=0)


class InvoiceBase(BaseModel):
    customer_id: int
    amount: DocumentAmount
    issue_date: date
    due_date: date
    description: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(BaseModel):
    customer_id: Optional[int] = None
    amount: Optional[DocumentAmount] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: Optional[InvoiceStatus] = None
    description: Optional[str] = None


class InvoiceSettlement(BaseModel):
    account_id: int = Field(gt=0)
    settlement_date: date
    transaction_id: Optional[int] = Field(default=None, gt=0)


class InvoiceOut(InvoiceBase):
    settlement_transaction_id: Optional[int] = None
    id: int
    user_id: int
    paid_date: Optional[date] = None
    status: InvoiceStatus
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, v: Optional[datetime]) -> Optional[str]:
        return v.isoformat() if v else None

    class Config:
        from_attributes = True
