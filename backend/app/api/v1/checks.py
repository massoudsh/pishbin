"""
Checks (cheques) API endpoints — issued/received cheque tracking.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.check import CheckStatus
from app.schemas.check import CheckCreate, CheckUpdate, CheckOut
from app.services.check_service import CheckService
from app.services.forecast_service import ForecastService

router = APIRouter()


@router.get("/", response_model=List[CheckOut])
async def get_checks(
    status_filter: Optional[CheckStatus] = None,
    account_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List current user's cheques, optionally filtered by status/account, sorted by due date."""
    service = CheckService(db)
    return service.get_user_checks(current_user.id, status=status_filter, account_id=account_id)


@router.get("/cash-flow-forecast")
async def get_check_cash_flow_forecast(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upcoming pending cheques (issued and received) due within `days`, as future cash events."""
    service = ForecastService(db)
    return service.get_upcoming_check_events(current_user.id, days=days)


@router.get("/{check_id}", response_model=CheckOut)
async def get_check(
    check_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific cheque by ID."""
    service = CheckService(db)
    check = service.get_check(check_id, current_user.id)
    if not check:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check not found")
    return check


@router.post("/", response_model=CheckOut, status_code=status.HTTP_201_CREATED)
async def create_check(
    check_data: CheckCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a new cheque (issued or received). `404` if the account doesn't belong to the user."""
    service = CheckService(db)
    check = service.create_check(check_data, current_user.id)
    if not check:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return check


@router.put("/{check_id}", response_model=CheckOut)
async def update_check(
    check_id: int,
    check_data: CheckUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a cheque (e.g. mark cleared/bounced/voided, or edit before it's settled)."""
    service = CheckService(db)
    existing = service.get_check(check_id, current_user.id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check not found")
    check = service.update_check(check_id, check_data, current_user.id)
    if not check:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account not found")
    return check


@router.delete("/{check_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_check(
    check_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a cheque. Blocked for cleared/bounced cheques — void it instead."""
    service = CheckService(db)
    check = service.get_check(check_id, current_user.id)
    if not check:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check not found")
    success, error = service.delete_check(check_id, current_user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error or "Cannot delete cheque")
