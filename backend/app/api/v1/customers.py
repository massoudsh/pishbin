"""
Customers API endpoints — customer entity + payment-behavior score (issue #50).
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerOut, CustomerScore
from app.services.customer_service import CustomerService

router = APIRouter()


@router.get("/", response_model=List[CustomerOut])
async def get_customers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's customers."""
    service = CustomerService(db)
    return service.get_user_customers(current_user.id)


@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific customer by ID."""
    service = CustomerService(db)
    customer = service.get_customer(customer_id, current_user.id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.get("/{customer_id}/score", response_model=CustomerScore)
async def get_customer_score(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Payment-behavior score: average invoice lateness + cheque bounce rate."""
    service = CustomerService(db)
    score = service.get_customer_score(customer_id, current_user.id)
    if not score:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return score


@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new customer."""
    service = CustomerService(db)
    return service.create_customer(customer_data, current_user.id)


@router.put("/{customer_id}", response_model=CustomerOut)
async def update_customer(
    customer_id: int,
    customer_data: CustomerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing customer."""
    service = CustomerService(db)
    customer = service.update_customer(customer_id, customer_data, current_user.id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a customer (and its invoices)."""
    service = CustomerService(db)
    if not service.delete_customer(customer_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
