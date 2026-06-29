import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, condecimal
from sqlalchemy.orm import Session

from app.api import deps
from app.models.bucket_budget import BucketBudget as BucketBudgetModel

logger = logging.getLogger("sigmaspend")
router = APIRouter()

VALID_KEYS = {"50_needs", "30_wants", "20_savings"}


class BucketBudgetUpsert(BaseModel):
    amount: condecimal(max_digits=10, decimal_places=2)


class BucketBudgetResponse(BaseModel):
    bucket_key: str
    amount: float

    model_config = {"from_attributes": True}


@router.get("/", response_model=List[BucketBudgetResponse])
def get_bucket_budgets(db: Session = Depends(deps.get_db)):
    return db.query(BucketBudgetModel).all()


@router.put("/{bucket_key}", response_model=BucketBudgetResponse)
def upsert_bucket_budget(bucket_key: str, payload: BucketBudgetUpsert, db: Session = Depends(deps.get_db)):
    if bucket_key not in VALID_KEYS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid bucket key: {bucket_key}")
    existing = db.query(BucketBudgetModel).filter(BucketBudgetModel.bucket_key == bucket_key).first()
    if existing:
        existing.amount = payload.amount
        db.commit()
        db.refresh(existing)
        return existing
    new = BucketBudgetModel(bucket_key=bucket_key, amount=payload.amount)
    db.add(new)
    db.commit()
    db.refresh(new)
    return new


@router.delete("/{bucket_key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bucket_budget(bucket_key: str, db: Session = Depends(deps.get_db)):
    existing = db.query(BucketBudgetModel).filter(BucketBudgetModel.bucket_key == bucket_key).first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No budget found for this bucket")
    db.delete(existing)
    db.commit()
