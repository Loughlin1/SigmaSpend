import logging
from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.bucket_budget import BucketBudget as BucketBudgetModel

logger = logging.getLogger("sigmaspend")

VALID_KEYS = {"50_needs", "30_wants", "20_savings"}


class BucketBudgetService:
    @staticmethod
    def list_all(db: Session) -> List[BucketBudgetModel]:
        return db.query(BucketBudgetModel).all()

    @staticmethod
    def is_valid_key(bucket_key: str) -> bool:
        return bucket_key in VALID_KEYS

    @staticmethod
    def get_by_key(db: Session, bucket_key: str) -> Optional[BucketBudgetModel]:
        return db.query(BucketBudgetModel).filter(BucketBudgetModel.bucket_key == bucket_key).first()

    @staticmethod
    def upsert(db: Session, bucket_key: str, amount: Decimal) -> BucketBudgetModel:
        existing = BucketBudgetService.get_by_key(db, bucket_key)
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
    def delete(db: Session, budget: BucketBudgetModel) -> None:
        db.delete(budget)
        db.commit()
