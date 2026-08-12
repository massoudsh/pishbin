"""Customer schemas for request/response validation."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_serializer


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    national_id: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    national_id: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = None


class CustomerOut(CustomerBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, v: Optional[datetime]) -> Optional[str]:
        return v.isoformat() if v else None

    class Config:
        from_attributes = True


class CustomerScore(BaseModel):
    """Simple payment-behavior score derived from invoice/cheque history."""
    customer_id: int
    total_invoices: int
    paid_invoices: int
    avg_days_late: float  # average days paid after due_date across paid invoices (0 if never late)
    total_checks: int
    bounced_checks: int
    bounced_check_rate: float  # 0..1
