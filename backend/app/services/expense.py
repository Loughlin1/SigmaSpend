# app/services/expense.py
import hashlib
import logging
from typing import Optional, List, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.expense import Expense as ExpenseModel
from app.models.category import Category as CategoryModel
from app.models.category_rules import CategoryRule as CategoryRuleModel
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.services.utilities import parse_uk_date

logger = logging.getLogger("sigmaspend")


class ExpenseService:
    @staticmethod
    def get_filtered_expenses(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        account_id: Optional[int] = None,
        is_income: Optional[bool] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        q: Optional[str] = None,
    ) -> List[ExpenseModel]:
        items, _ = ExpenseService.get_filtered_expenses_with_count(
            db, skip, limit, category, account_id, is_income, start_date, end_date, q
        )
        return items

    @staticmethod
    def get_filtered_expenses_with_count(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        account_id: Optional[int] = None,
        is_income: Optional[bool] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        q: Optional[str] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        sort_date: Optional[str] = "desc",
        holiday_id: Optional[int] = None,
    ) -> Tuple[List[ExpenseModel], int]:
        query = db.query(ExpenseModel).options(
            joinedload(ExpenseModel.category_rel).joinedload(CategoryModel.parent)
        )

        if category:
            cat_values = [c.strip() for c in category.split(',') if c.strip()]
            allowed_ids = set()
            include_uncategorized = False

            for cat_value in cat_values:
                if cat_value.lower() == "uncategorized":
                    include_uncategorized = True
                    continue
                direct_only = cat_value.endswith('::direct')
                cat_name = cat_value[:-8] if direct_only else cat_value
                matched_cat = db.query(CategoryModel).filter(CategoryModel.name == cat_name).first()
                if matched_cat:
                    if not direct_only and matched_cat.subcategories:
                        allowed_ids.add(matched_cat.id)
                        allowed_ids.update(sub.id for sub in matched_cat.subcategories)
                    else:
                        allowed_ids.add(matched_cat.id)

            if include_uncategorized and allowed_ids:
                query = query.filter(
                    (ExpenseModel.category_id.is_(None)) |
                    (ExpenseModel.category_id.in_(allowed_ids))
                )
            elif include_uncategorized:
                query = query.filter(ExpenseModel.category_id.is_(None))
            elif allowed_ids:
                query = query.filter(ExpenseModel.category_id.in_(allowed_ids))
            else:
                query = query.filter(ExpenseModel.category_id == -1)

        if account_id:
            query = query.filter(ExpenseModel.account_id == account_id)
        if is_income is not None:
            query = query.filter(ExpenseModel.is_income == is_income)
        if start_date:
            query = query.filter(ExpenseModel.date >= parse_uk_date(start_date, logger))
        if end_date:
            query = query.filter(ExpenseModel.date <= parse_uk_date(end_date, logger))
        if q:
            search_term = f"%{q.strip().lower()}%"
            query = query.filter(
                (ExpenseModel.description.ilike(search_term)) |
                (ExpenseModel.notes.ilike(search_term))
            )
        if min_amount is not None:
            query = query.filter(ExpenseModel.amount >= min_amount)
        if max_amount is not None:
            query = query.filter(ExpenseModel.amount <= max_amount)
        if holiday_id is not None:
            if holiday_id == -1:
                query = query.filter(ExpenseModel.holiday_id.is_(None))
            else:
                query = query.filter(ExpenseModel.holiday_id == holiday_id)

        total_count = query.count()
        date_order = ExpenseModel.date.asc() if sort_date == "asc" else ExpenseModel.date.desc()
        items = query.order_by(date_order).offset(skip).limit(limit).all()
        return items, total_count

    @staticmethod
    def get_by_id(db: Session, expense_id: int) -> Optional[ExpenseModel]:
        return db.query(ExpenseModel).options(
            joinedload(ExpenseModel.category_rel).joinedload(CategoryModel.parent)
        ).filter(ExpenseModel.id == expense_id).first()

    @staticmethod
    def create_manual_expense(db: Session, expense_in: ExpenseCreate) -> ExpenseModel:
        expense_data = expense_in.dict()
        expense_data["date"] = parse_uk_date(expense_data["date"], logger)

        fallback_seed = f"manual-{expense_in.account_id}-{expense_data['date']}-{expense_in.amount}-{expense_in.description}"
        generated_hash = hashlib.sha256(fallback_seed.encode("utf-8")).hexdigest()
        expense_data["transaction_hash"] = generated_hash

        db_obj = ExpenseModel(**expense_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    @staticmethod
    def update(db: Session, expense: ExpenseModel, expense_in: ExpenseUpdate) -> ExpenseModel:
        update_data = expense_in.dict(exclude_unset=True)
        if "date" in update_data and update_data["date"] is not None:
            update_data["date"] = parse_uk_date(update_data["date"], logger)

        for field, value in update_data.items():
            setattr(expense, field, value)

        db.add(expense)
        db.commit()
        db.refresh(expense)
        logger.info(f"Updated fields {list(update_data.keys())} for expense ID {expense.id}")
        return ExpenseService.get_by_id(db, expense.id)

    @staticmethod
    def delete(db: Session, expense: ExpenseModel) -> None:
        expense_id = expense.id
        db.delete(expense)
        db.commit()
        logger.info(f"Permanently deleted expense ID {expense_id}")

    @staticmethod
    def get_distinct_years(db: Session, account_id: Optional[int] = None) -> List[int]:
        year_col = func.strftime("%Y", ExpenseModel.date)
        query = db.query(year_col.label("year"))
        if account_id:
            query = query.filter(ExpenseModel.account_id == account_id)
        rows = query.group_by(year_col).order_by(year_col.desc()).all()
        return [int(r.year) for r in rows if r.year]

    @staticmethod
    def bulk_classify(db: Session, expense_ids: List[int], category_id: int) -> int:
        db.query(ExpenseModel).filter(ExpenseModel.id.in_(expense_ids)).update(
            {ExpenseModel.category_id: category_id}, synchronize_session=False
        )
        db.commit()
        return len(expense_ids)

    @staticmethod
    def bulk_delete(db: Session, expense_ids: List[int]) -> int:
        deleted = db.query(ExpenseModel).filter(ExpenseModel.id.in_(expense_ids)).delete(
            synchronize_session=False
        )
        db.commit()
        return deleted

    @staticmethod
    def bulk_update_type(db: Session, expense_ids: List[int], is_income: bool) -> int:
        db.query(ExpenseModel).filter(ExpenseModel.id.in_(expense_ids)).update(
            {ExpenseModel.is_income: is_income}, synchronize_session=False
        )
        db.commit()
        return len(expense_ids)

    @staticmethod
    def bulk_assign_holiday(db: Session, expense_ids: List[int], holiday_id: Optional[int]) -> int:
        updated = db.query(ExpenseModel).filter(ExpenseModel.id.in_(expense_ids)).update(
            {ExpenseModel.holiday_id: holiday_id}, synchronize_session=False
        )
        db.commit()
        return updated

    @staticmethod
    def bulk_reclassify(db: Session, expense_ids: List[int]) -> int:
        from app.services.parser import StatementParserService
        expenses = db.query(ExpenseModel).filter(ExpenseModel.id.in_(expense_ids)).all()
        all_rules = db.query(CategoryRuleModel).all()
        _, category_map = StatementParserService._get_category_cache(db)

        for expense in expenses:
            expense.category_id = StatementParserService._assign_category(expense, all_rules, category_map)

        db.commit()
        return len(expenses)
