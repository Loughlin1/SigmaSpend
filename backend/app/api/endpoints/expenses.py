# backend/app/api/endpoints/expenses.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    AnalyticalBreakdownResponse, BulkCategoryUpdate,
    BulkDeleteRequest, BulkTypeUpdate, BulkReclassifyRequest,
    BulkHolidayAssign, PaginatedExpenseResponse,
)
from app.models.expense import Expense as ExpenseModel
from app.services.expense import ExpenseService
from app.services.analytics import ExpenseAnalyticsService

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.get("/", response_model=PaginatedExpenseResponse)
def read_expenses(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category: Optional[str] = Query(None),
    account_id: Optional[int] = Query(None),
    is_income: Optional[bool] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    sort_date: Optional[str] = Query("desc"),
    holiday_id: Optional[str] = Query(None),
):
    logger.info(f"Fetching expenses (skip={skip}, limit={limit})")
    parsed_holiday_id = None if holiday_id is None else (-1 if holiday_id == "none" else int(holiday_id))
    items, total_count = ExpenseService.get_filtered_expenses_with_count(
        db, skip, limit, category, account_id, is_income, start_date, end_date,
        q, min_amount, max_amount, sort_date, parsed_holiday_id,
    )
    return {"items": items, "total_count": total_count, "page": (skip // limit) + 1, "limit": limit}


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(*, db: Session = Depends(deps.get_db), expense_in: ExpenseCreate):
    db_obj = ExpenseService.create_manual_expense(db, expense_in)
    return ExpenseService.get_by_id(db, db_obj.id)


@router.get("/analytics/summary", response_model=List[AnalyticalBreakdownResponse])
def read_expenses_summary(
    db: Session = Depends(deps.get_db),
    account_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    group_by: str = Query("month", regex="^(month|year|day)$"),
    holiday_id: Optional[int] = Query(None),
):
    return ExpenseAnalyticsService.get_multi_tier_summary(
        db, logger, account_id, start_date, end_date, group_by, holiday_id
    )


@router.get("/analytics/years", response_model=List[int])
def read_expense_years(
    db: Session = Depends(deps.get_db),
    account_id: Optional[int] = Query(None),
):
    return ExpenseService.get_distinct_years(db, account_id)


@router.get("/_debug/models")
def debug_models():
    return {"status": "healthy"}


@router.get("/{expense_id}", response_model=ExpenseResponse)
def read_expense(expense_id: int, db: Session = Depends(deps.get_db)):
    expense = ExpenseService.get_by_id(db, expense_id)
    if not expense:
        logger.warning(f"Expense lookup failed: ID {expense_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense record not found")
    return expense


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(*, db: Session = Depends(deps.get_db), expense_id: int, expense_in: ExpenseUpdate):
    expense = db.query(ExpenseModel).filter(ExpenseModel.id == expense_id).first()
    if not expense:
        logger.warning(f"Update failed: Expense ID {expense_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense record not found")
    return ExpenseService.update(db, expense, expense_in)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: int, db: Session = Depends(deps.get_db)):
    expense = db.query(ExpenseModel).filter(ExpenseModel.id == expense_id).first()
    if not expense:
        logger.warning(f"Delete failed: Expense ID {expense_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense record not found")
    ExpenseService.delete(db, expense)
    return None


@router.post("/bulk-classify", status_code=status.HTTP_200_OK)
def bulk_classify_expenses(payload: BulkCategoryUpdate, db: Session = Depends(deps.get_db)):
    logger.info(f"Bulk classifying {len(payload.expense_ids)} transactions to Category ID {payload.category_id}")
    count = ExpenseService.bulk_classify(db, payload.expense_ids, payload.category_id)
    return {"message": f"Successfully updated {count} transactions"}


@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
def bulk_delete_expenses(payload: BulkDeleteRequest, db: Session = Depends(deps.get_db)):
    logger.info(f"Bulk deleting {len(payload.expense_ids)} transactions")
    deleted = ExpenseService.bulk_delete(db, payload.expense_ids)
    return {"deleted": deleted}


@router.post("/bulk-update-type", status_code=status.HTTP_200_OK)
def bulk_update_expense_type(payload: BulkTypeUpdate, db: Session = Depends(deps.get_db)):
    logger.info(f"Bulk setting is_income={payload.is_income} on {len(payload.expense_ids)} transactions")
    count = ExpenseService.bulk_update_type(db, payload.expense_ids, payload.is_income)
    return {"message": f"Successfully updated {count} transactions"}


@router.post("/bulk-reclassify", status_code=status.HTTP_200_OK)
def bulk_reclassify_expenses(payload: BulkReclassifyRequest, db: Session = Depends(deps.get_db)):
    logger.info(f"Bulk re-running automation rules on {len(payload.expense_ids)} transactions")
    updated = ExpenseService.bulk_reclassify(db, payload.expense_ids)
    return {"updated": updated}


@router.post("/bulk-assign-holiday", status_code=status.HTTP_200_OK)
def bulk_assign_holiday(payload: BulkHolidayAssign, db: Session = Depends(deps.get_db)):
    logger.info(f"Bulk assigning holiday_id={payload.holiday_id} to {len(payload.expense_ids)} transactions")
    updated = ExpenseService.bulk_assign_holiday(db, payload.expense_ids, payload.holiday_id)
    return {"updated": updated}
