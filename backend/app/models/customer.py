"""
Customer model — a counterparty (buyer) whose invoices/cheques feed the
payment-behavior score used to gauge cash-flow risk.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Customer(Base):
    """A customer (buyer) of the user's business."""
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String, nullable=True)
    national_id = Column(String(20), nullable=True)  # کد ملی/اقتصادی
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="customers")
    invoices = relationship("Invoice", back_populates="customer", cascade="all, delete-orphan")
    checks = relationship("Check", back_populates="customer")

    def __repr__(self):
        return f"<Customer(id={self.id}, name={self.name})>"
