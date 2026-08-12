"""
Alerts service for budget alerts and notifications.
"""
from typing import List, Dict
from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.budget import Budget
from app.models.transaction import Transaction, TransactionType
from app.services.forecast_service import ForecastService


class AlertsService:
    """Service for alerts and notifications."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_budget_alerts(self, user_id: int) -> List[Dict]:
        """Get budget alerts for user."""
        alerts = []
        budgets = self.db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.is_active == True
        ).all()
        
        for budget in budgets:
            # Calculate spending
            spent = self.db.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == user_id,
                Transaction.transaction_type == TransactionType.EXPENSE,
                Transaction.date >= budget.start_date
            )
            
            if budget.end_date:
                spent = spent.filter(Transaction.date <= budget.end_date)
            
            if budget.category_id:
                spent = spent.filter(Transaction.category_id == budget.category_id)
            
            spent_amount = spent.scalar() or Decimal("0.00")
            percentage = (spent_amount / Decimal(str(budget.amount)) * 100) if budget.amount > 0 else 0
            
            # Alert if over 80% of budget
            if percentage >= 80:
                alerts.append({
                    "budget_id": budget.id,
                    "budget_name": budget.name,
                    "spent": float(spent_amount),
                    "budget_amount": float(budget.amount),
                    "percentage": float(percentage),
                    "alert_type": "warning" if percentage < 100 else "critical"
                })

        return alerts

    def get_cash_flow_alerts(self, user_id: int, days: int = 30, threshold: float = 0) -> List[Dict]:
        """
        Proactive cash-flow risk alert (issue #51): if the `days`-day forecast
        (current balance + known future events + historical trend) projects
        below `threshold`, raise a warning/critical alert — mirroring the
        existing >=80% budget-alert pattern above, but forward-looking.
        """
        forecast = ForecastService(self.db).get_cash_flow_forecast(user_id, days=days)
        projected_balance = forecast["projected_balance"]

        if projected_balance >= threshold:
            return []

        current_balance = forecast["current_balance"]
        # Critical if the current balance itself is already at/under threshold
        # (the risk isn't just projected, it's arguably already here);
        # warning if it's the `days`-day projection that dips below.
        alert_type = "critical" if current_balance <= threshold else "warning"

        return [{
            "type": "cash_flow_risk",
            "days": days,
            "current_balance": current_balance,
            "projected_balance": projected_balance,
            "threshold": threshold,
            "alert_type": alert_type,
        }]

