"""
Accounts API endpoints.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountUpdate, Account as AccountSchema
from app.services.accounts_service import AccountsService
from app.services.business_service import BusinessService

router = APIRouter()


@router.get("/", response_model=List[AccountSchema])
async def get_accounts(
    business_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all accounts for the current user, optionally filtered by business."""
    service = AccountsService(db)
    return service.get_user_accounts(current_user.id, business_id=business_id, skip=skip, limit=limit)


@router.get("/{account_id}", response_model=AccountSchema)
async def get_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific account by ID."""
    service = AccountsService(db)
    account = service.get_account(account_id, current_user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    return account


@router.post("/", response_model=AccountSchema, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_data: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new account."""
    business_service = BusinessService(db)
    if not business_service.get_business(account_data.business_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found"
        )
    service = AccountsService(db)
    return service.create_account(account_data, current_user.id)


@router.put("/{account_id}", response_model=AccountSchema)
async def update_account(
    account_id: int,
    account_data: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing account."""
    service = AccountsService(db)
    account = service.update_account(account_id, account_data, current_user.id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an account."""
    service = AccountsService(db)
    success = service.delete_account(account_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

