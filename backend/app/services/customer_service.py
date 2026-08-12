"""
Customer service — CRUD plus a simple payment-behavior score derived from
invoice lateness and cheque bounce history (issue #50).
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceStatus
from app.models.check import Check, CheckDirection, CheckStatus
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerService:
    """Service for customer operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_user_customers(self, user_id: int) -> List[Customer]:
        """List a user's customers, most recently created first."""
        return (
            self.db.query(Customer)
            .filter(Customer.user_id == user_id)
            .order_by(Customer.created_at.desc())
            .all()
        )

    def get_customer(self, customer_id: int, user_id: int) -> Optional[Customer]:
        """Get a specific customer by ID, scoped to owner."""
        return self.db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.user_id == user_id,
        ).first()

    def create_customer(self, customer_data: CustomerCreate, user_id: int) -> Customer:
        """Create a new customer."""
        db_customer = Customer(**customer_data.model_dump(), user_id=user_id)
        self.db.add(db_customer)
        self.db.commit()
        self.db.refresh(db_customer)
        return db_customer

    def update_customer(
        self, customer_id: int, customer_data: CustomerUpdate, user_id: int
    ) -> Optional[Customer]:
        """Update an existing customer."""
        customer = self.get_customer(customer_id, user_id)
        if not customer:
            return None

        update_data = customer_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(customer, field, value)

        self.db.commit()
        self.db.refresh(customer)
        return customer

    def delete_customer(self, customer_id: int, user_id: int) -> bool:
        """Delete a customer (and its invoices, via cascade)."""
        customer = self.get_customer(customer_id, user_id)
        if not customer:
            return False
        self.db.delete(customer)
        self.db.commit()
        return True

    def get_customer_score(self, customer_id: int, user_id: int) -> Optional[dict]:
        """
        Simple payment-behavior score for a customer:
        - avg_days_late: average of max(0, paid_date - due_date) over paid invoices
        - bounced_check_rate: bounced / total cheques received from this customer
        """
        customer = self.get_customer(customer_id, user_id)
        if not customer:
            return None

        invoices = self.db.query(Invoice).filter(Invoice.customer_id == customer_id).all()
        paid_invoices = [inv for inv in invoices if inv.status == InvoiceStatus.PAID and inv.paid_date]
        if paid_invoices:
            total_days_late = sum(
                max(0, (inv.paid_date - inv.due_date).days) for inv in paid_invoices
            )
            avg_days_late = total_days_late / len(paid_invoices)
        else:
            avg_days_late = 0.0

        checks = self.db.query(Check).filter(
            Check.customer_id == customer_id,
            Check.direction == CheckDirection.RECEIVED,
        ).all()
        bounced_checks = [c for c in checks if c.status == CheckStatus.BOUNCED]
        bounced_check_rate = (len(bounced_checks) / len(checks)) if checks else 0.0

        return {
            "customer_id": customer_id,
            "total_invoices": len(invoices),
            "paid_invoices": len(paid_invoices),
            "avg_days_late": round(avg_days_late, 1),
            "total_checks": len(checks),
            "bounced_checks": len(bounced_checks),
            "bounced_check_rate": round(bounced_check_rate, 3),
        }
