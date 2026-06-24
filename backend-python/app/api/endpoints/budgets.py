import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.budget import Budget as BudgetModel
from app.models.category import Category as CategoryModel
from app.schemas.budget import BudgetUpsert, BudgetResponse

logger = logging.getLogger("sigmaspend")
router = APIRouter()


@router.get("/", response_model=List[BudgetResponse])
def get_budgets(db: Session = Depends(deps.get_db)):
    logger.info("Fetching all budgets")
    return db.query(BudgetModel).all()


@router.put("/{category_id}", response_model=BudgetResponse)
def upsert_budget(category_id: int, payload: BudgetUpsert, db: Session = Depends(deps.get_db)):
    category = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    existing = db.query(BudgetModel).filter(BudgetModel.category_id == category_id).first()
    if existing:
        existing.amount = payload.amount
        existing.period = payload.period
        db.commit()
        db.refresh(existing)
        logger.info(f"Updated budget for category_id={category_id}: £{payload.amount} ({payload.period})")
        return existing

    new_budget = BudgetModel(category_id=category_id, amount=payload.amount, period=payload.period)
    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)
    logger.info(f"Created budget for category_id={category_id}: £{payload.amount} ({payload.period})")
    return new_budget


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(category_id: int, db: Session = Depends(deps.get_db)):
    existing = db.query(BudgetModel).filter(BudgetModel.category_id == category_id).first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No budget found for this category")
    db.delete(existing)
    db.commit()
    logger.info(f"Deleted budget for category_id={category_id}")
