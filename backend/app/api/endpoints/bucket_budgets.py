import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, condecimal
from sqlalchemy.orm import Session

from app.api import deps
from app.services.bucket_budget import BucketBudgetService

logger = logging.getLogger("sigmaspend")
router = APIRouter()


class BucketBudgetUpsert(BaseModel):
    amount: condecimal(max_digits=10, decimal_places=2)


class BucketBudgetResponse(BaseModel):
    bucket_key: str
    amount: float

    model_config = {"from_attributes": True}


@router.get("/", response_model=List[BucketBudgetResponse])
def get_bucket_budgets(db: Session = Depends(deps.get_db)):
    return BucketBudgetService.list_all(db)


@router.put("/{bucket_key}", response_model=BucketBudgetResponse)
def upsert_bucket_budget(bucket_key: str, payload: BucketBudgetUpsert, db: Session = Depends(deps.get_db)):
    if not BucketBudgetService.is_valid_key(bucket_key):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid bucket key: {bucket_key}")
    return BucketBudgetService.upsert(db, bucket_key, payload.amount)


@router.delete("/{bucket_key}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bucket_budget(bucket_key: str, db: Session = Depends(deps.get_db)):
    existing = BucketBudgetService.get_by_key(db, bucket_key)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No budget found for this bucket")
    BucketBudgetService.delete(db, existing)
