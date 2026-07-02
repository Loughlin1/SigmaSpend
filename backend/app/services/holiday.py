import logging
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.models.holiday import Holiday as HolidayModel
from app.models.expense import Expense as ExpenseModel
from app.schemas.holiday import HolidayCreate, HolidayUpdate, HolidayResponse
from app.exceptions import HolidayNotFoundError

logger = logging.getLogger("sigmaspend")


class HolidayService:
    @staticmethod
    def _get_aggregates(db: Session, holiday_id: int) -> tuple[int, float]:
        expense_count = func.sum(case((ExpenseModel.is_income == False, 1), else_=0))
        expense_sum = func.sum(case((ExpenseModel.is_income == False, ExpenseModel.amount), else_=0.0))
        income_sum = func.sum(case((ExpenseModel.is_income == True, ExpenseModel.amount), else_=0.0))
        count, expenses, income = db.query(expense_count, expense_sum, income_sum).filter(
            ExpenseModel.holiday_id == holiday_id,
        ).one()
        # Net spend: expenses minus any income (e.g. reimbursements) logged against the holiday.
        total_spend = round(float(expenses or 0.0) - float(income or 0.0), 2)
        return int(count or 0), total_spend

    @staticmethod
    def _to_response(db: Session, h: HolidayModel) -> HolidayResponse:
        expense_count, total_spend = HolidayService._get_aggregates(db, h.id)
        return HolidayResponse(
            id=h.id, name=h.name, destination=h.destination,
            start_date=h.start_date, end_date=h.end_date, notes=h.notes,
            flag=h.flag, expense_count=expense_count, total_spend=total_spend,
        )

    @staticmethod
    def list_all(db: Session) -> List[HolidayResponse]:
        holidays = db.query(HolidayModel).order_by(HolidayModel.start_date.desc().nullslast()).all()
        return [HolidayService._to_response(db, h) for h in holidays]

    @staticmethod
    def create(db: Session, holiday_in: HolidayCreate) -> HolidayResponse:
        db_obj = HolidayModel(**holiday_in.model_dump())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Created holiday '{db_obj.name}' (id={db_obj.id})")
        return HolidayResponse(
            id=db_obj.id, name=db_obj.name, destination=db_obj.destination,
            start_date=db_obj.start_date, end_date=db_obj.end_date,
            notes=db_obj.notes, flag=db_obj.flag, expense_count=0, total_spend=0.0,
        )

    @staticmethod
    def get_by_id(db: Session, holiday_id: int) -> HolidayModel:
        h = db.query(HolidayModel).filter(HolidayModel.id == holiday_id).first()
        if not h:
            raise HolidayNotFoundError(f"Holiday '{holiday_id}' not found")
        return h

    @staticmethod
    def update(db: Session, holiday_id: int, holiday_in: HolidayUpdate) -> HolidayResponse:
        h = HolidayService.get_by_id(db, holiday_id)
        for field, value in holiday_in.model_dump(exclude_unset=True).items():
            setattr(h, field, value)
        db.commit()
        db.refresh(h)
        logger.info(f"Updated holiday '{h.name}' (id={h.id})")
        return HolidayService._to_response(db, h)

    @staticmethod
    def delete(db: Session, holiday_id: int) -> None:
        h = HolidayService.get_by_id(db, holiday_id)
        db.query(ExpenseModel).filter(ExpenseModel.holiday_id == h.id).update({"holiday_id": None})
        db.delete(h)
        db.commit()
        logger.info(f"Deleted holiday id={h.id}")
