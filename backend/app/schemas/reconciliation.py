"""
Bank statement reconciliation schemas.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class ReconciliationMatch(BaseModel):
    """A bank statement row matched to an existing transaction."""
    row_index: int
    statement_date: datetime
    statement_amount: Decimal
    statement_description: Optional[str] = None
    transaction_id: int
    transaction_date: datetime


class ReconciliationUnmatched(BaseModel):
    """A bank statement row with no matching transaction found."""
    row_index: int
    statement_date: datetime
    statement_amount: Decimal
    statement_type: str
    statement_description: Optional[str] = None
    reason: str


class ReconciliationResult(BaseModel):
    """Outcome of reconciling a bank statement against recorded transactions."""
    account_id: int
    total_rows: int
    matched_count: int
    unmatched_count: int
    matches: List[ReconciliationMatch]
    unmatched: List[ReconciliationUnmatched]
    row_errors: List[str] = []
