"""
Invoices API endpoints — customer receivables (issue #48), feeding the
cash-flow forecast as future inflow events.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceOut
from app.services.invoice_service import InvoiceService
from app.services.forecast_service import ForecastService

router = APIRouter()


@router.get("/", response_model=List[InvoiceOut])
async def get_invoices(
    customer_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's invoices, optionally filtered by customer, sorted by due date."""
    service = InvoiceService(db)
    return service.get_user_invoices(current_user.id, customer_id=customer_id)


@router.get("/cash-flow-forecast")
async def get_invoice_cash_flow_forecast(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unpaid invoices due within `days`, as future cash inflow events."""
    service = ForecastService(db)
    return service.get_upcoming_invoice_events(current_user.id, days=days)


@router.get("/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific invoice by ID."""
    service = InvoiceService(db)
    invoice = service.get_invoice(invoice_id, current_user.id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


@router.post("/", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new invoice. `404` if the customer doesn't belong to the user."""
    service = InvoiceService(db)
    invoice = service.create_invoice(invoice_data, current_user.id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceOut)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an invoice (e.g. mark paid/cancelled, or edit before it's settled)."""
    service = InvoiceService(db)
    existing = service.get_invoice(invoice_id, current_user.id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    invoice = service.update_invoice(invoice_id, invoice_data, current_user.id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customer not found")
    return invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an invoice. Blocked once paid."""
    service = InvoiceService(db)
    invoice = service.get_invoice(invoice_id, current_user.id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    success, error = service.delete_invoice(invoice_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error or "Cannot delete invoice")
