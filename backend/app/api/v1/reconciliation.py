"""
Bank statement reconciliation API endpoint.
"""
import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.reconciliation import ReconciliationResult
from app.services.reconciliation_service import ReconciliationService

router = APIRouter()


@router.post("/bank-statement", response_model=ReconciliationResult)
async def reconcile_bank_statement(
    file: UploadFile = File(...),
    account_id: int = Query(..., description="Account to reconcile the statement against"),
    window_days: int = Query(3, ge=0, le=30, description="Date tolerance (days) when matching a row to a transaction"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Reconcile an uploaded bank statement (CSV) against transactions already recorded
    for the given account. CSV must have headers: date, amount, type, description
    (type = income or expense). Read-only — does not create or modify any transaction;
    returns matched rows and a report of unmatched rows for manual review.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be a CSV")
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV is empty or has no data rows.")

    service = ReconciliationService(db)
    try:
        return service.reconcile(current_user.id, account_id, rows, window_days=window_days)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
