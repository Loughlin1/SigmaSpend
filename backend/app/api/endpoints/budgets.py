import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.budget import BudgetUpsert, BudgetResponse
from app.services.budget import BudgetService

logger = logging.getLogger("sigmaspend")
router = APIRouter()


@router.get("/", response_model=List[BudgetResponse])
def get_budgets(db: Session = Depends(deps.get_db)):
    logger.info("Fetching all budgets")
    return BudgetService.list_all(db)


@router.put("/{category_id}", response_model=BudgetResponse)
def upsert_budget(category_id: int, payload: BudgetUpsert, db: Session = Depends(deps.get_db)):
    if not BudgetService.get_category(db, category_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return BudgetService.upsert(db, category_id, payload.amount, payload.period)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(category_id: int, db: Session = Depends(deps.get_db)):
    existing = BudgetService.get_by_category(db, category_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No budget found for this category")
    BudgetService.delete(db, existing, category_id)
