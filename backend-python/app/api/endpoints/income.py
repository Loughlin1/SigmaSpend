import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.models.income_settings import IncomeSettings as IncomeModel
from app.schemas.income_settings import IncomeSettingsUpdate, IncomeSettingsResponse

logger = logging.getLogger("sigmaspend")
router = APIRouter()


def _get_or_create(db: Session) -> IncomeModel:
    row = db.query(IncomeModel).first()
    if not row:
        row = IncomeModel(monthly_net_income=0)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/", response_model=IncomeSettingsResponse)
def get_income(db: Session = Depends(deps.get_db)):
    logger.info("Fetching income settings")
    return _get_or_create(db)


@router.put("/", response_model=IncomeSettingsResponse)
def update_income(payload: IncomeSettingsUpdate, db: Session = Depends(deps.get_db)):
    row = _get_or_create(db)
    row.monthly_net_income = payload.monthly_net_income
    db.commit()
    db.refresh(row)
    logger.info(f"Updated monthly net income to £{payload.monthly_net_income}")
    return row
