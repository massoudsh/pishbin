"""
Transactions API endpoints.
"""
import csv
import io
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.transaction import TransactionCreate, TransactionUpdate, Transaction as TransactionSchema
from app.services.transactions_service import TransactionsService

router = APIRouter()


@router.get("/", response_model=List[TransactionSchema])
async def get_transactions(
    skip: int = 0,
    limit: int = 100,
    account_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    q: Optional[str] = Query(None, description="Search in description"),
    amount_min: Optional[float] = Query(None),
    amount_max: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all transactions with optional filters and search."""
    service = TransactionsService(db)
    return service.get_user_transactions(
        current_user.id,
        skip=skip,
        limit=limit,
        account_id=account_id,
        category_id=category_id,
        start_date=start_date,
        end_date=end_date,
        q=q,
        amount_min=amount_min,
        amount_max=amount_max,
    )


@router.get("/export")
async def export_transactions_csv(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export transactions as CSV."""
    service = TransactionsService(db)
    data = service.export_for_user(current_user.id, start_date=start_date, end_date=end_date)
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=["id", "date", "amount", "type", "description", "account_id", "category_id"])
    writer.writeheader()
    writer.writerows(data)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )


@router.post("/import")
async def import_transactions_csv(
    file: UploadFile = File(...),
    account_id: int = Query(..., description="Account to assign imported transactions to"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Import transactions from a CSV file.
    CSV must have headers: date, amount, type, description (type = income or expense).
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
        return {"created": 0, "errors": ["CSV is empty or has no data rows."]}
    service = TransactionsService(db)
    try:
        created, errors = service.import_from_rows(current_user.id, account_id, rows)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"created": created, "errors": errors, "total_rows": len(rows)}


@router.get("/{transaction_id}", response_model=TransactionSchema)
async def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific transaction by ID."""
    service = TransactionsService(db)
    transaction = service.get_transaction(transaction_id, current_user.id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    return transaction


@router.post("/", response_model=TransactionSchema, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: TransactionCreate,
    force: Optional[bool] = Query(False, description="Create even if possible duplicate"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new transaction. Returns 409 if possible duplicate (use ?force=true to create anyway)."""
    service = TransactionsService(db)
    try:
        return service.create_transaction(
            transaction_data,
            current_user.id,
            skip_duplicate_check=force,
        )
    except ValueError as e:
        if len(e.args) >= 2 and e.args[0] == "POSSIBLE_DUPLICATE":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "code": "possible_duplicate",
                    "existing_id": e.args[1],
                    "existing_date": e.args[2] if len(e.args) > 2 else None,
                },
            ) from e
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.put("/{transaction_id}", response_model=TransactionSchema)
async def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing transaction."""
    service = TransactionsService(db)
    try:
        transaction = service.update_transaction(transaction_id, transaction_data, current_user.id)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a transaction."""
    service = TransactionsService(db)
    try:
        success = service.delete_transaction(transaction_id, current_user.id)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

