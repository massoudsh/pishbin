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
from app.models.invoice import Invoice, InvoiceStatus
from app.models.account import Account


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

    def get_upcoming_invoice_events(self, user_id: int, days: int = 30) -> Dict:
        """
        Unpaid invoices due within the next `days`, as future cash inflow events
        (receivables). Overdue invoices already past due are still included —
        they're money owed, just at higher risk of slipping.
        """
        today = date.today()
        end_date = today + timedelta(days=days)

        pending = (
            self.db.query(Invoice)
            .filter(
                Invoice.user_id == user_id,
                Invoice.status.in_([InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE]),
                Invoice.due_date <= end_date,
            )
            .order_by(Invoice.due_date.asc())
            .all()
        )

        events = [
            {
                "invoice_id": inv.id,
                "customer_id": inv.customer_id,
                "due_date": inv.due_date.isoformat(),
                "amount": float(inv.amount),
                "overdue": inv.due_date < today,
            }
            for inv in pending
        ]
        total_inflow = sum(e["amount"] for e in events)

        return {
            "days": days,
            "events": events,
            "total_inflow": total_inflow,
        }

    def get_cash_flow_forecast(self, user_id: int, days: int = 30) -> Dict:
        """
        30-day cash-flow forecast (issue #49): combine known future events
        (pending cheques + unpaid invoices) with the historical daily trend
        of ordinary transactions, on top of the current total account balance.
        This is the "known events + historical trend" base model called for
        in the issue, ahead of any heavier ML forecasting.
        """
        current_balance = float(
            self.db.query(func.sum(Account.balance)).filter(
                Account.user_id == user_id,
                Account.is_active == True,  # noqa: E712
            ).scalar() or Decimal("0.00")
        )

        check_events = self.get_upcoming_check_events(user_id, days=days)
        invoice_events = self.get_upcoming_invoice_events(user_id, days=days)
        known_events_net = check_events["net"] + invoice_events["total_inflow"]

        # Historical daily trend: average daily (income - expense) over the
        # last 90 days of ordinary transactions, extrapolated over `days`.
        trend_start = date.today() - timedelta(days=90)
        income = self.db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.INCOME,
            Transaction.date >= trend_start,
        ).scalar() or Decimal("0.00")
        expense = self.db.query(func.sum(Transaction.amount)).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == TransactionType.EXPENSE,
            Transaction.date >= trend_start,
        ).scalar() or Decimal("0.00")
        avg_daily_net = float(income - expense) / 90
        trend_net = avg_daily_net * days

        projected_net = known_events_net + trend_net
        projected_balance = current_balance + projected_net

        return {
            "days": days,
            "current_balance": current_balance,
            "known_events_net": known_events_net,
            "trend_net": trend_net,
            "projected_net": projected_net,
            "projected_balance": projected_balance,
            "check_events": check_events["events"],
            "invoice_events": invoice_events["events"],
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

