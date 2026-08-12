"""Invoice schemas for request/response validation."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_serializer

from app.models.invoice import InvoiceStatus


class InvoiceBase(BaseModel):
    customer_id: int
    amount: Decimal = Field(..., gt=0)
    issue_date: date
    due_date: date
    description: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(BaseModel):
    customer_id: Optional[int] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: Optional[InvoiceStatus] = None
    description: Optional[str] = None


class InvoiceOut(InvoiceBase):
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
