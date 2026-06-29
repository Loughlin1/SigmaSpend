# app/services/expense.py
import hashlib
import logging
from typing import Optional, List, Tuple  # ◄ Added Tuple for typing clarity
from sqlalchemy.orm import Session, joinedload
from app.models.expense import Expense as ExpenseModel
from app.models.category import Category as CategoryModel
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
        q: Optional[str] = None
    ) -> List[ExpenseModel]:
        # Keep this function exactly as it is for backwards compatibility with any remaining endpoints
        # or use-cases that bypass pagination.
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
    ) -> Tuple[List[ExpenseModel], int]:  # ◄ Returns (Items, TotalCount)
        """
        Applies filters dynamically and returns a tuple containing the 
        paginated dataset slice along with a total scalar query match count.
        """
        query = db.query(ExpenseModel).options(
            joinedload(ExpenseModel.category_rel).joinedload(CategoryModel.parent)
        )

        # Apply all dynamic filter conditions sequentially
        if category:
            # Support comma-separated list of category values for multiselect
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

        # Execute count operation BEFORE slicing with offset/limit
        total_count = query.count()

        date_order = ExpenseModel.date.asc() if sort_date == "asc" else ExpenseModel.date.desc()
        items = query.order_by(date_order).offset(skip).limit(limit).all()

        return items, total_count

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