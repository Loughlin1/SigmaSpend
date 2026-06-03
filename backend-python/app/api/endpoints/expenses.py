from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

# Synced with your exact project layout and schema names
from app.api import deps
from app.models.expense import Expense as ExpenseModel
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse

router = APIRouter()


@router.get("/", response_model=List[ExpenseResponse])
def read_expenses(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=500, description="Max number of records to return"),
    category: Optional[str] = Query(None, description="Filter by expense category"),
    start_date: Optional[str] = Query(None, description="Filter expenses from this date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter expenses up to this date (YYYY-MM-DD)")
):
    """
    Retrieve a paginated and filtered list of expenses.
    Returns ExpenseResponse containing the database id and transaction_hash.
    """
    query = db.query(ExpenseModel)
    
    if category:
        query = query.filter(ExpenseModel.category == category)
    if start_date:
        query = query.filter(ExpenseModel.date >= start_date)
    if end_date:
        query = query.filter(ExpenseModel.date <= end_date)
        
    # Order by date descending so the newest items hit the React History view first
    expenses = query.order_by(ExpenseModel.date.desc()).offset(skip).limit(limit).all()
    return expenses


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_in: ExpenseCreate
):
    """
    Create a manual expense entry via the frontend Form component.
    Generates a placeholder transaction_hash since it bypasses statement ingestion.
    """
    # Create the model instance from the validation schema
    db_obj = ExpenseModel(**expense_in.dict())
    
    # For manual entries, generate a deterministic fallback hash or tag
    # to fit your Schema contract without breaking the Deduplication Engine rules.
    import hashlib
    import time
    fallback_seed = f"manual-{expense_in.date}-{expense_in.amount}-{time.time()}"
    db_obj.transaction_hash = hashlib.sha256(fallback_seed.encode()).hexdigest()

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


@router.get("/{expense_id}", response_model=ExpenseResponse)
def read_expense(
    expense_id: int,
    db: Session = Depends(deps.get_db)
):
    """
    Fetch a single record by its ID.
    """
    expense = db.query(ExpenseModel).filter(ExpenseModel.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found"
        )
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_id: int,
    expense_in: ExpenseUpdate
):
    """
    Update an existing transaction's details (e.g. recategorising an item).
    """
    expense = db.query(ExpenseModel).filter(ExpenseModel.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found"
        )
        
    update_data = expense_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(expense, field, update_data[field])
        
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(deps.get_db)
):
    """
    Remove an individual expense transaction.
    """
    expense = db.query(ExpenseModel).filter(ExpenseModel.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found"
        )
    db.delete(expense)
    db.commit()
    return None