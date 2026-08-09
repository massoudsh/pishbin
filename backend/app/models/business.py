"""
Business model for multi-business / multi-branch workspaces.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Business(Base):
    """A business/workspace owned by a user. Accounts belong to a business."""
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="businesses")
    accounts = relationship("Account", back_populates="business")

    def __repr__(self):
        return f"<Business(id={self.id}, name={self.name}, owner_id={self.owner_id})>"
