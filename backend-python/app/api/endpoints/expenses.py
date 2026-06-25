# backend-python/app/api/endpoints/expenses.py
from datetime import date
from dateutil import parser
from dateutil.parser import ParserError
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.models.expense import Expense as ExpenseModel
from app.models.category import Category as CategoryModel
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    AnalyticalBreakdownResponse, BulkCategoryUpdate,
    BulkDeleteRequest, BulkTypeUpdate, BulkReclassifyRequest,
    PaginatedExpenseResponse
)
from app.services.expense import ExpenseService
from app.services.analytics import ExpenseAnalyticsService
from app.services.parser import StatementParserService
from app.models.category_rules import CategoryRule as CategoryRuleModel
from app.services.utilities import parse_uk_date

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.get("/", response_model=PaginatedExpenseResponse)
def read_expenses(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=500, description="Max number of records to return"),
    category: Optional[str] = Query(None, description="Filter by expense category"),
    account_id: Optional[int] = Query(None, description="Filter by specific bank account"),
    is_income: Optional[bool] = Query(None, description="Filter by type: True for Income, False for Expense"),
    start_date: Optional[str] = Query(None, description="Filter expenses from this date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter expenses up to this date (YYYY-MM-DD)"),
    q: Optional[str] = Query(None, description="Search transaction descriptions or notes"),
    min_amount: Optional[float] = Query(None, description="Filter expenses with amount >= this value"),
    max_amount: Optional[float] = Query(None, description="Filter expenses with amount <= this value"),
    sort_date: Optional[str] = Query("desc", description="Sort by date: 'asc' or 'desc'"),
):
    """
    Retrieve a paginated and filtered list of expenses.
    Returns ExpenseResponse containing the database id and transaction_hash.
    """
    logger.info(
        f"Fetching expenses (skip={skip}, limit={limit}) with filters: "
        f"category={category}, account_id={account_id}, is_income={is_income}, "
        f"start_date={start_date}, end_date={end_date}, q={q}, "
        f"min_amount={min_amount}, max_amount={max_amount}"
    )
    items, total_count = ExpenseService.get_filtered_expenses_with_count(
        db, skip, limit, category, account_id, is_income, start_date, end_date, q, min_amount, max_amount, sort_date
    )
    current_page = (skip // limit) + 1
    return {
        "items": items,
        "total_count": total_count,
        "page": current_page,
        "limit": limit
    }


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
    db_obj = ExpenseService.create_manual_expense(db, expense_in)
    # Return with loaded tree
    return db.query(ExpenseModel).options(
        joinedload(ExpenseModel.category_rel).joinedload(CategoryModel.parent)
    ).filter(ExpenseModel.id == db_obj.id).first()


@router.get("/analytics/summary", response_model=List[AnalyticalBreakdownResponse])
def read_expenses_summary(
    db: Session = Depends(deps.get_db),
    account_id: Optional[int] = Query(None, description="Filter by specific bank account"),
    start_date: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter up to date (YYYY-MM-DD)"),
    group_by: str = Query("month", regex="^(month|year|day)$", description="Timeline granularity")
):
    """
    Retrieve an aggregated financial summary breakdown of global grand totals, 
    parent categories, and subcategories for the selected timeline.
    """
    results = ExpenseAnalyticsService.get_multi_tier_summary(
        db, logger, account_id, start_date, end_date, group_by
    )
    return results

@router.get("/analytics/years", response_model=List[int])
def read_expense_years(
    db: Session = Depends(deps.get_db),
    account_id: Optional[int] = Query(None, description="Filter by specific bank account"),
):
    """Return the distinct years that have expense data, sorted descending."""
    from sqlalchemy import func
    year_col = func.strftime("%Y", ExpenseModel.date)
    query = db.query(year_col.label("year"))
    if account_id:
        query = query.filter(ExpenseModel.account_id == account_id)
    rows = query.group_by(year_col).order_by(year_col.desc()).all()
    return [int(r.year) for r in rows if r.year]


@router.get("/{expense_id}", response_model=ExpenseResponse)
def read_expense(
    expense_id: int,
    db: Session = Depends(deps.get_db)
):
    """
    Fetch a single record by its ID.
    """
    expense = db.query(ExpenseModel).options(
        joinedload(ExpenseModel.category_rel).joinedload(CategoryModel.parent)
    ).filter(ExpenseModel.id == expense_id).first()

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
        update_data["date"] = parse_uk_date(update_data["date"], logger)

    for field in update_data:
        setattr(expense, field, update_data[field])
        
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    logger.info(f"Updated fields {list(update_data.keys())} for expense ID {expense_id}")
    return db.query(ExpenseModel).options(
        joinedload(ExpenseModel.category_rel).joinedload(CategoryModel.parent)
    ).filter(ExpenseModel.id == expense_id).first()


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



@router.post("/bulk-classify", status_code=status.HTTP_200_OK)
def bulk_classify_expenses(
    payload: BulkCategoryUpdate,
    db: Session = Depends(deps.get_db)
):
    logger.info(f"Bulk classifying {len(payload.expense_ids)} transactions to Category ID {payload.category_id}")
    db.query(ExpenseModel).filter(ExpenseModel.id.in_(payload.expense_ids)).update(
        {ExpenseModel.category_id: payload.category_id},
        synchronize_session=False
    )
    db.commit()
    return {"message": f"Successfully updated {len(payload.expense_ids)} transactions"}


@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
def bulk_delete_expenses(
    payload: BulkDeleteRequest,
    db: Session = Depends(deps.get_db)
):
    logger.info(f"Bulk deleting {len(payload.expense_ids)} transactions")
    deleted = db.query(ExpenseModel).filter(ExpenseModel.id.in_(payload.expense_ids)).delete(
        synchronize_session=False
    )
    db.commit()
    return {"deleted": deleted}


@router.post("/bulk-update-type", status_code=status.HTTP_200_OK)
def bulk_update_expense_type(
    payload: BulkTypeUpdate,
    db: Session = Depends(deps.get_db)
):
    logger.info(f"Bulk setting is_income={payload.is_income} on {len(payload.expense_ids)} transactions")
    db.query(ExpenseModel).filter(ExpenseModel.id.in_(payload.expense_ids)).update(
        {ExpenseModel.is_income: payload.is_income},
        synchronize_session=False
    )
    db.commit()
    return {"message": f"Successfully updated {len(payload.expense_ids)} transactions"}


@router.post("/bulk-reclassify", status_code=status.HTTP_200_OK)
def bulk_reclassify_expenses(
    payload: BulkReclassifyRequest,
    db: Session = Depends(deps.get_db)
):
    logger.info(f"Bulk re-running automation rules on {len(payload.expense_ids)} transactions")
    expenses = db.query(ExpenseModel).filter(ExpenseModel.id.in_(payload.expense_ids)).all()
    all_rules = db.query(CategoryRuleModel).all()
    _, category_map = StatementParserService._get_category_cache(db)

    updated = 0
    for expense in expenses:
        cat_id = StatementParserService._assign_category(expense, all_rules, category_map)
        expense.category_id = cat_id
        updated += 1

    db.commit()
    return {"updated": updated}