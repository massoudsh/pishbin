"""
Check (cheque) model — first-class entity for issued/received cheques.
Iranian SME context: Sayad tracking number, bank, due date, clearing status.
"""
import enum
from sqlalchemy import Column, Integer, String, Numeric, DateTime, Date, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class CheckDirection(str, enum.Enum):
    """Whether the cheque is issued by us (we pay) or received by us (we get paid)."""
    ISSUED = "issued"
    RECEIVED = "received"


class CheckStatus(str, enum.Enum):
    """Cheque lifecycle status."""
    PENDING = "pending"        # در جریان وصول
    CLEARED = "cleared"        # وصول‌شده
    BOUNCED = "bounced"        # برگشتی
    VOIDED = "voided"          # باطل‌شده


class Check(Base):
    """A cheque (issued or received), tracked as a future/past cash event."""
    __tablename__ = "checks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, index=True)
    direction = Column(Enum(CheckDirection), nullable=False)
    counterparty_name = Column(String(200), nullable=False)  # issuer if received, payee if issued
    amount = Column(Numeric(14, 0), nullable=False)  # Rials, no decimals
    bank_name = Column(String(100), nullable=True)
    check_number = Column(String(50), nullable=True)
    sayad_id = Column(String(16), nullable=True, index=True)  # شماره صیادی (16 digits)
    due_date = Column(Date, nullable=False, index=True)
    status = Column(Enum(CheckStatus), nullable=False, default=CheckStatus.PENDING)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="checks")
    account = relationship("Account", back_populates="checks")

    def __repr__(self):
        return f"<Check(id={self.id}, direction={self.direction}, amount={self.amount}, due={self.due_date}, status={self.status})>"
