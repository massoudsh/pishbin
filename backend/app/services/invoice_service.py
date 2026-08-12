"""
Invoice service — CRUD for customer invoices (receivables). Due dates feed
the cash-flow forecast as future inflow events (issue #48 / #49).
"""
from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.invoice import Invoice, InvoiceStatus
from app.models.customer import Customer
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate


class InvoiceService:
    """Service for invoice operations."""

    def __init__(self, db: Session):
        self.db = db

    def _sync_overdue(self, invoice: Invoice) -> Invoice:
        """Flip an unpaid invoice past its due date to `overdue` on read."""
        if invoice.status == InvoiceStatus.ISSUED and invoice.due_date < date.today():
            invoice.status = InvoiceStatus.OVERDUE
            self.db.commit()
            self.db.refresh(invoice)
        return invoice

    def get_user_invoices(
        self, user_id: int, customer_id: Optional[int] = None
    ) -> List[Invoice]:
        """List a user's invoices, optionally filtered by customer, ordered by due date."""
        query = self.db.query(Invoice).filter(Invoice.user_id == user_id)
        if customer_id is not None:
            query = query.filter(Invoice.customer_id == customer_id)
        invoices = query.order_by(Invoice.due_date.asc()).all()
        return [self._sync_overdue(inv) for inv in invoices]

    def get_invoice(self, invoice_id: int, user_id: int) -> Optional[Invoice]:
        """Get a specific invoice by ID, scoped to owner."""
        invoice = self.db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.user_id == user_id,
        ).first()
        return self._sync_overdue(invoice) if invoice else None

    def create_invoice(self, invoice_data: InvoiceCreate, user_id: int) -> Optional[Invoice]:
        """Create a new invoice. Returns None if the customer doesn't belong to the user."""
        customer = self.db.query(Customer).filter(
            Customer.id == invoice_data.customer_id,
            Customer.user_id == user_id,
        ).first()
        if not customer:
            return None

        db_invoice = Invoice(**invoice_data.model_dump(), user_id=user_id)
        self.db.add(db_invoice)
        self.db.commit()
        self.db.refresh(db_invoice)
        return db_invoice

    def update_invoice(
        self, invoice_id: int, invoice_data: InvoiceUpdate, user_id: int
    ) -> Optional[Invoice]:
        """Update an existing invoice. Marking status=paid auto-fills paid_date if not given."""
        invoice = self.db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.user_id == user_id,
        ).first()
        if not invoice:
            return None

        update_data = invoice_data.model_dump(exclude_unset=True)
        if "customer_id" in update_data:
            customer = self.db.query(Customer).filter(
                Customer.id == update_data["customer_id"],
                Customer.user_id == user_id,
            ).first()
            if not customer:
                return None

        for field, value in update_data.items():
            setattr(invoice, field, value)

        if invoice.status == InvoiceStatus.PAID and not invoice.paid_date:
            invoice.paid_date = date.today()

        self.db.commit()
        self.db.refresh(invoice)
        return invoice

    def delete_invoice(self, invoice_id: int, user_id: int) -> tuple[bool, Optional[str]]:
        """Delete an invoice. Returns (success, error_message). Blocked once paid."""
        invoice = self.db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.user_id == user_id,
        ).first()
        if not invoice:
            return False, None

        if invoice.status == InvoiceStatus.PAID:
            return False, "Cannot delete a paid invoice"

        self.db.delete(invoice)
        self.db.commit()
        return True, None
