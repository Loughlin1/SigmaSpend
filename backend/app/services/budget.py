import logging
from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.budget import Budget as BudgetModel
from app.models.category import Category as CategoryModel

logger = logging.getLogger("sigmaspend")


class BudgetService:
    @staticmethod
    def list_all(db: Session) -> List[BudgetModel]:
        return db.query(BudgetModel).all()

    @staticmethod
    def get_category(db: Session, category_id: int) -> Optional[CategoryModel]:
        return db.query(CategoryModel).filter(CategoryModel.id == category_id).first()

    @staticmethod
    def get_by_category(db: Session, category_id: int) -> Optional[BudgetModel]:
        return db.query(BudgetModel).filter(BudgetModel.category_id == category_id).first()

    @staticmethod
    def upsert(db: Session, category_id: int, amount: Decimal, period: str) -> BudgetModel:
        log_payload = {"category_id": category_id, "amount": float(amount), "period": period}
        existing = BudgetService.get_by_category(db, category_id)
        if existing:
            existing.amount = amount
            existing.period = period
            db.commit()
            db.refresh(existing)
            logger.info(f"Updated budget for category_id={category_id}: £{amount} ({period})", extra={"payload": log_payload})
            return existing

        new_budget = BudgetModel(category_id=category_id, amount=amount, period=period)
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
        logger.info(f"Created budget for category_id={category_id}: £{amount} ({period})", extra={"payload": log_payload})
        return new_budget

    @staticmethod
    def delete(db: Session, budget: BudgetModel, category_id: int) -> None:
        db.delete(budget)
        db.commit()
        logger.info(f"Deleted budget for category_id={category_id}", extra={"payload": {"category_id": category_id}})
