import logging
from typing import List
from fastapi import APIRouter, Depends
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
    return BudgetService.upsert(db, category_id, payload.amount, payload.period)


@router.delete("/{category_id}", status_code=204)
def delete_budget(category_id: int, db: Session = Depends(deps.get_db)):
    BudgetService.delete(db, category_id)
