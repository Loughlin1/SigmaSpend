from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.holiday import HolidayCreate, HolidayUpdate, HolidayResponse
from app.services.holiday import HolidayService

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.get("/", response_model=List[HolidayResponse])
def read_holidays(db: Session = Depends(deps.get_db)):
    return HolidayService.list_all(db)


@router.post("/", response_model=HolidayResponse, status_code=201)
def create_holiday(holiday_in: HolidayCreate, db: Session = Depends(deps.get_db)):
    return HolidayService.create(db, holiday_in)


@router.put("/{holiday_id}", response_model=HolidayResponse)
def update_holiday(holiday_id: int, holiday_in: HolidayUpdate, db: Session = Depends(deps.get_db)):
    return HolidayService.update(db, holiday_id, holiday_in)


@router.delete("/{holiday_id}", status_code=204)
def delete_holiday(holiday_id: int, db: Session = Depends(deps.get_db)):
    HolidayService.delete(db, holiday_id)
