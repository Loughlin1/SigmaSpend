# app/services/expense.py
import hashlib
import logging
from typing import Optional, List
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
        q: Optional[str] = None  # Search term parameter
    ) -> List[ExpenseModel]:
        
        # Always eager load categories and their parents for the UI layers
        query = db.query(ExpenseModel).options(
            joinedload(ExpenseModel.category_rel).joinedload(CategoryModel.parent)
        )

        if category:
            cat_clean = category.strip().lower()
            if cat_clean == "uncategorized":
                # FIX: Check if category_id is missing or points to nothing
                query = query.filter(
                    (ExpenseModel.category_id.is_(None)) | 
                    (ExpenseModel.category_id == "")
                )    
            else:
                matched_cat = db.query(CategoryModel).filter(CategoryModel.name == category).first()
                if matched_cat: 
                    if matched_cat.subcategories:
                        allowed_ids = [matched_cat.id] + [sub.id for sub in matched_cat.subcategories]
                        query = query.filter(ExpenseModel.category_id.in_(allowed_ids))
                    else:
                        query = query.filter(ExpenseModel.category_id == matched_cat.id)
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

        return query.order_by(ExpenseModel.date.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def create_manual_expense(db: Session, expense_in: ExpenseCreate) -> ExpenseModel:
        expense_data = expense_in.dict()
        expense_data["date"] = parse_uk_date(expense_data["date"], logger)
        
        # Deterministic generation for unique hash requirement
        fallback_seed = f"manual-{expense_in.account_id}-{expense_data['date']}-{expense_in.amount}-{expense_in.description}"
        generated_hash = hashlib.sha256(fallback_seed.encode("utf-8")).hexdigest()
        expense_data["transaction_hash"] = generated_hash
        
        db_obj = ExpenseModel(**expense_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        logger.info(
            f"Manually created expense ID {db_obj.id} for account {db_obj.account_id} "
            f"with generated hash: {generated_hash[:8]}..."
        )
        return db_obj