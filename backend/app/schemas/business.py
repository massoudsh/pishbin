"""
Business schemas for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BusinessBase(BaseModel):
    """Base business schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class BusinessCreate(BusinessBase):
    """Schema for business creation."""
    pass


class BusinessUpdate(BaseModel):
    """Schema for business update."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class BusinessInDB(BusinessBase):
    """Business schema with database fields."""
    id: int
    owner_id: int
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Business(BusinessInDB):
    """Business response schema."""
    pass
