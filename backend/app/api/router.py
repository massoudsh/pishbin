"""
API router configuration.
"""
from fastapi import APIRouter
from app.api.v1 import auth, accounts, transactions, budgets, goals, dashboard, reports, alerts, categories, banking_messages, payments, recurring, api_keys, backup

api_router = APIRouter()

# Include all API endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(api_keys.router, prefix="/api-keys", tags=["api-keys"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
api_router.include_router(goals.router, prefix="/goals", tags=["goals"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(banking_messages.router, prefix="/banking-messages", tags=["banking-messages"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(recurring.router, prefix="/recurring", tags=["recurring"])
api_router.include_router(backup.router, prefix="/backup", tags=["backup"])

