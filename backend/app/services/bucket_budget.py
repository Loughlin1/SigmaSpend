import logging
from typing import List
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.bucket_budget import BucketBudget as BucketBudgetModel
from app.exceptions import InvalidBucketKeyError, BucketBudgetNotFoundError

logger = logging.getLogger("sigmaspend")

VALID_KEYS = {"50_needs", "30_wants", "20_savings"}


class BucketBudgetService:
    @staticmethod
    def list_all(db: Session) -> List[BucketBudgetModel]:
        return db.query(BucketBudgetModel).all()

    @staticmethod
    def upsert(db: Session, bucket_key: str, amount: Decimal) -> BucketBudgetModel:
        if bucket_key not in VALID_KEYS:
            raise InvalidBucketKeyError(f"Invalid bucket key: {bucket_key}")
        existing = db.query(BucketBudgetModel).filter(BucketBudgetModel.bucket_key == bucket_key).first()
        if existing:
            existing.amount = amount
            db.commit()
            db.refresh(existing)
            return existing
        new = BucketBudgetModel(bucket_key=bucket_key, amount=amount)
        db.add(new)
        db.commit()
        db.refresh(new)
        return new

    @staticmethod
    def delete(db: Session, bucket_key: str) -> None:
        existing = db.query(BucketBudgetModel).filter(BucketBudgetModel.bucket_key == bucket_key).first()
        if not existing:
            raise BucketBudgetNotFoundError(f"No budget found for bucket '{bucket_key}'")
        db.delete(existing)
        db.commit()
