"""
Invoice model — first-class receivable, the counterpart of Check as a future
cash event. Issue date / due date drive the cash-flow forecast; the eventual
سامانه مودیان (tax e-invoicing) integration is a later phase.
"""
import enum
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Date, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class InvoiceStatus(str, enum.Enum):
    """Invoice lifecycle status. `overdue` is derived, not stored server-side by clients."""
    ISSUED = "issued"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class Invoice(Base):
    """An invoice issued to a customer — a future/past cash inflow."""
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    amount = Column(Numeric(14, 0), nullable=False)  # Rials, no decimals
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    paid_date = Column(Date, nullable=True)
    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.ISSUED)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")

    def __repr__(self):
        return f"<Invoice(id={self.id}, customer_id={self.customer_id}, amount={self.amount}, due={self.due_date}, status={self.status})>"
