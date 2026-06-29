import logging
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.income_settings import IncomeSettings as IncomeModel

logger = logging.getLogger("sigmaspend")


class IncomeService:
    @staticmethod
    def get_or_create(db: Session) -> IncomeModel:
        row = db.query(IncomeModel).first()
        if not row:
            row = IncomeModel(monthly_net_income=0)
            db.add(row)
            db.commit()
            db.refresh(row)
        return row

    @staticmethod
    def update(db: Session, monthly_net_income: Decimal) -> IncomeModel:
        row = IncomeService.get_or_create(db)
        row.monthly_net_income = monthly_net_income
        db.commit()
        db.refresh(row)
        logger.info(
            f"Updated monthly net income to £{monthly_net_income}",
            extra={"payload": {"monthly_net_income": float(monthly_net_income)}},
        )
        return row
