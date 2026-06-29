import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.income_settings import IncomeSettingsUpdate, IncomeSettingsResponse
from app.services.income import IncomeService

logger = logging.getLogger("sigmaspend")
router = APIRouter()


@router.get("/", response_model=IncomeSettingsResponse)
def get_income(db: Session = Depends(deps.get_db)):
    logger.info("Fetching income settings")
    return IncomeService.get_or_create(db)


@router.put("/", response_model=IncomeSettingsResponse)
def update_income(payload: IncomeSettingsUpdate, db: Session = Depends(deps.get_db)):
    return IncomeService.update(db, payload.monthly_net_income)
