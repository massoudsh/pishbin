"""
Forecast service for financial forecasting.
"""
from typing import Dict, List
from datetime import datetime, timedelta, date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.transaction import Transaction, TransactionType
from app.models.check import Check, CheckDirection, CheckStatus


class ForecastService:
    """Service for financial forecasting."""

    def __init__(self, db: Session):
        self.db = db

    def get_upcoming_check_events(self, user_id: int, days: int = 30) -> Dict:
        """
        Pending cheques (issued and received) due within the next `days`, as future cash events.
        Issued cheques are outflows (we pay); received cheques are inflows (we get paid).
        This is a direct, known-amount cash event — unlike the historical-average expense
        forecast below, it doesn't need estimation.
        """
        today = date.today()
        end_date = today + timedelta(days=days)

        pending = (
            self.db.query(Check)
            .filter(
                Check.user_id == user_id,
                Check.status == CheckStatus.PENDING,
                Check.due_date >= today,
                Check.due_date <= end_date,
            )
            .order_by(Check.due_date.asc())
            .all()
        )

        events = [
            {
                "check_id": c.id,
                "due_date": c.due_date.isoformat(),
                "direction": c.direction.value,
                "amount": float(c.amount),
                "counterparty_name": c.counterparty_name,
            }
            for c in pending
        ]
        total_inflow = sum(e["amount"] for e in events if e["direction"] == CheckDirection.RECEIVED.value)
        total_outflow = sum(e["amount"] for e in events if e["direction"] == CheckDirection.ISSUED.value)

        return {
            "days": days,
            "events": events,
            "total_inflow": total_inflow,
            "total_outflow": total_outflow,
            "net": total_inflow - total_outflow,
        }

    def forecast_monthly_expenses(
        self,
        user_id: int,
        months: int = 3
    ) -> List[Dict]:
        """Forecast monthly expenses based on historical data."""
        # Get average monthly expenses from last 6 months
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180)  # 6 months
        
        avg_monthly = self.db.query(func.avg(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.date >= start_date,
            Transaction.date <= end_date
        ).scalar() or Decimal("0.00")
        
        forecasts = []
        for i in range(months):
            forecast_date = end_date + timedelta(days=30 * (i + 1))
            forecasts.append({
                "month": forecast_date.strftime("%Y-%m"),
                "forecasted_amount": float(avg_monthly)
            })
        
        return forecasts

