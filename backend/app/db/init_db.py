"""
Database initialization script.
"""
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import user, account, transaction, budget, goal, category, banking_message, payment, recurring  # noqa: F401
from app.models.category import Category

# Default cost/expense categories for banking and transactions
DEFAULT_CATEGORIES = [
    {"name": "Groceries", "description": "Food and household", "color": "#22c55e"},
    {"name": "Dining", "description": "Restaurants and takeout", "color": "#f59e0b"},
    {"name": "Transport", "description": "Fuel, transit, parking", "color": "#3b82f6"},
    {"name": "Rent & Utilities", "description": "Rent, electricity, water, gas", "color": "#8b5cf6"},
    {"name": "Shopping", "description": "Retail and online", "color": "#ec4899"},
    {"name": "Healthcare", "description": "Medical and pharmacy", "color": "#ef4444"},
    {"name": "Subscriptions", "description": "Streaming, apps, memberships", "color": "#06b6d4"},
    {"name": "Income", "description": "Salary, deposits, refunds", "color": "#10b981"},
]


def seed_categories(db: Session) -> None:
    """Create default categories if none exist."""
    if db.query(Category).first() is not None:
        return
    for c in DEFAULT_CATEGORIES:
        db.add(Category(name=c["name"], description=c.get("description"), color=c.get("color")))
    db.commit()


def init_db() -> None:
    """Initialize database tables and seed default categories."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_categories(db)
    finally:
        db.close()


if __name__ == "__main__":
    init_db()

