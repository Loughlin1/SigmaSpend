# backend-python/app/api/endpoints/expenses.py
from datetime import date
from dateutil import parser
from dateutil.parser import ParserError
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.expense import Expense as ExpenseModel
from app.models.category import Category as CategoryModel
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()

def parse_uk_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    if isinstance(date_str, date):
        return date_str
    try:
        # Automatically processes YYYY-MM-DD and prioritises DD/MM/YYYY text streams
        return parser.parse(str(date_str), dayfirst=True).date()
    except (ParserError, TypeError):
        logger.warning(f"Date parsing failed for input: '{date_str}'")
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid date format: '{date_str}'. Please provide a readable date layout."
        )


@router.get("/", response_model=List[ExpenseResponse])
def read_expenses(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=500, description="Max number of records to return"),
    category: Optional[str] = Query(None, description="Filter by expense category"),
    account_id: Optional[str] = Query(None, description="Filter by specific bank account"),
    is_income: Optional[bool] = Query(None, description="Filter by type: True for Income, False for Expense"),
    start_date: Optional[str] = Query(None, description="Filter expenses from this date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter expenses up to this date (YYYY-MM-DD)")
):
    """
    Retrieve a paginated and filtered list of expenses.
    Returns ExpenseResponse containing the database id and transaction_hash.
    """
    logger.info(
        f"Fetching expenses (skip={skip}, limit={limit}) with filters: "
        f"category={category}, account_id={account_id}, is_income={is_income}, "
        f"start_date={start_date}, end_date={end_date}"
    )
    
    query = db.query(ExpenseModel)

    if category:
        if category.strip().lower() == "uncategorized":
            # Captures items saved as "Uncategorized", empty string, or None
            query = query.filter(
                (ExpenseModel.category == "Uncategorized") | 
                (ExpenseModel.category == "") | 
                (ExpenseModel.category.is_(None))
            )    
        else:
            # Check if parent category or subcategory
            parent_cat = db.query(CategoryModel).filter(CategoryModel.name == category).first()
            if parent_cat and parent_cat.subcategories:
                subcategory_names = [sub.name for sub in parent_cat.subcategories]
                allowed_categories = [category] + subcategory_names
                query = query.filter(ExpenseModel.category.in_(allowed_categories))
            else:
                query = query.filter(ExpenseModel.category == category)
    if account_id:
        query = query.filter(ExpenseModel.account_id == account_id)
    if is_income is not None:
        query = query.filter(ExpenseModel.is_income == is_income)
    if start_date:
        db_start_date = parse_uk_date(start_date)
        query = query.filter(ExpenseModel.date >= db_start_date)
    if end_date:
        db_end_date = parse_uk_date(end_date)
        query = query.filter(ExpenseModel.date <= db_end_date)
        
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
    expense_data = expense_in.dict()
    expense_data["date"] = parse_uk_date(expense_data["date"])
    
    # For manual entries, generate a deterministic fallback hash or tag
    # to fit your Schema contract without breaking the Deduplication Engine rules.
    import hashlib
    fallback_seed = f"manual-{expense_in.account_id}-{expense_data['date']}-{expense_in.amount}-{expense_in.description}"
    generated_hash = hashlib.sha256(fallback_seed.encode("utf-8")).hexdigest()
    expense_data["transaction_hash"] = generated_hash
    
    db_obj = ExpenseModel(**expense_data)

    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    logger.info(
        f"Manually created expense ID {db_obj.id} for account {db_obj.account_id} "
        f"with generated hash: {generated_hash[:8]}..."
    )
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
        logger.warning(f"Expense lookup failed: ID {expense_id} not found.")
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
        logger.warning(f"Update failed: Expense ID {expense_id} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found"
        )
        
    update_data = expense_in.dict(exclude_unset=True)
    if "date" in update_data and update_data["date"] is not None:
        update_data["date"] = parse_uk_date(update_data["date"])

    for field in update_data:
        setattr(expense, field, update_data[field])
        
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    logger.info(f"Updated fields {list(update_data.keys())} for expense ID {expense_id}")
    return expense


@router.get("/_debug/models")
def debug_models():
    """Debug utility to ensure metadata is healthy."""
    return {"status": "healthy"}


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
        logger.warning(f"Delete failed: Expense ID {expense_id} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found"
        )
    db.delete(expense)
    db.commit()
    
    logger.info(f"Permanently deleted expense ID {expense_id}")
    return None