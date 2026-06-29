from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api import deps
from app.models.holiday import Holiday as HolidayModel
from app.models.expense import Expense as ExpenseModel
from app.schemas.holiday import HolidayCreate, HolidayUpdate, HolidayResponse

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.get("/", response_model=List[HolidayResponse])
def read_holidays(db: Session = Depends(deps.get_db)):
    holidays = db.query(HolidayModel).order_by(HolidayModel.start_date.desc().nullslast()).all()
    result = []
    for h in holidays:
        expense_count = db.query(func.count(ExpenseModel.id)).filter(
            ExpenseModel.holiday_id == h.id,
            ExpenseModel.is_income == False,
        ).scalar() or 0
        total_spend = db.query(func.sum(ExpenseModel.amount)).filter(
            ExpenseModel.holiday_id == h.id,
            ExpenseModel.is_income == False,
        ).scalar() or 0.0
        result.append(HolidayResponse(
            id=h.id, name=h.name, destination=h.destination,
            start_date=h.start_date, end_date=h.end_date, notes=h.notes,
            flag=h.flag, expense_count=expense_count, total_spend=round(total_spend, 2),
        ))
    return result


@router.post("/", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED)
def create_holiday(holiday_in: HolidayCreate, db: Session = Depends(deps.get_db)):
    db_obj = HolidayModel(**holiday_in.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    logger.info(f"Created holiday '{db_obj.name}' (id={db_obj.id})")
    return HolidayResponse(id=db_obj.id, name=db_obj.name, destination=db_obj.destination,
                           start_date=db_obj.start_date, end_date=db_obj.end_date,
                           notes=db_obj.notes, flag=db_obj.flag, expense_count=0, total_spend=0.0)


@router.put("/{holiday_id}", response_model=HolidayResponse)
def update_holiday(holiday_id: int, holiday_in: HolidayUpdate, db: Session = Depends(deps.get_db)):
    h = db.query(HolidayModel).filter(HolidayModel.id == holiday_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Holiday not found")
    for field, value in holiday_in.model_dump(exclude_unset=True).items():
        setattr(h, field, value)
    db.commit()
    db.refresh(h)
    logger.info(f"Updated holiday '{h.name}' (id={h.id})")
    expense_count = db.query(func.count(ExpenseModel.id)).filter(
        ExpenseModel.holiday_id == h.id, ExpenseModel.is_income == False).scalar() or 0
    total_spend = db.query(func.sum(ExpenseModel.amount)).filter(
        ExpenseModel.holiday_id == h.id, ExpenseModel.is_income == False).scalar() or 0.0
    return HolidayResponse(id=h.id, name=h.name, destination=h.destination,
                           start_date=h.start_date, end_date=h.end_date, notes=h.notes,
                           flag=h.flag, expense_count=expense_count, total_spend=round(total_spend, 2))


@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(holiday_id: int, db: Session = Depends(deps.get_db)):
    h = db.query(HolidayModel).filter(HolidayModel.id == holiday_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Holiday not found")
    # Unlink expenses before deleting
    db.query(ExpenseModel).filter(ExpenseModel.holiday_id == holiday_id).update({"holiday_id": None})
    db.delete(h)
    db.commit()
    logger.info(f"Deleted holiday id={holiday_id}")
