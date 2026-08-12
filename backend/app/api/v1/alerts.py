"""
Budget alerts API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.alerts_service import AlertsService

router = APIRouter()


@router.get("/", response_model=List[dict])
async def get_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get budget alerts for the current user (e.g. budgets at or over 80% spent)."""
    service = AlertsService(db)
    return service.get_budget_alerts(current_user.id)


@router.get("/cash-flow", response_model=List[dict])
async def get_cash_flow_alerts(
    days: int = 30,
    threshold: float = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Proactive cash-flow risk alert: raised when the `days`-day cash-flow
    forecast projects a balance at/under `threshold`.
    """
    service = AlertsService(db)
    return service.get_cash_flow_alerts(current_user.id, days=days, threshold=threshold)
