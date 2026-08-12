"""
Dashboard API endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.reports_service import ReportsService
from app.services.metrics_service import get_founder_overview, get_cash_summary_digest
from app.services.forecast_service import ForecastService

router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard summary statistics."""
    service = ReportsService(db)
    return service.get_dashboard_summary(current_user.id)


@router.get("/founder-overview")
async def get_founder_overview_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Founder Financial Command Center: KPIs, sparklines, burn intelligence."""
    return get_founder_overview(db, current_user.id)


@router.get("/cash-summary-digest")
async def get_cash_summary_digest_endpoint(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Last N days: cash in, cash out, net, top 3 expense categories. For weekly digest email (cron calls this)."""
    return get_cash_summary_digest(db, current_user.id, days=days)


@router.get("/cash-flow-forecast")
async def get_cash_flow_forecast_endpoint(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    `days`-day cash-flow forecast: current balance + known future events
    (pending cheques, unpaid invoices) + historical daily trend.
    """
    service = ForecastService(db)
    return service.get_cash_flow_forecast(current_user.id, days=days)

