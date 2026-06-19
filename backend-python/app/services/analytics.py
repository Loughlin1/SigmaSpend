# backend-python/app/services/analytics.py
from typing import List, Optional
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, case, literal_column, text, union_all, select  # <-- Add select here
import logging

from app.models.expense import Expense as ExpenseModel
from app.models.category import Category as CategoryModel
from app.services.utilities import parse_uk_date 

class ExpenseAnalyticsService:
    @staticmethod
    def get_multi_tier_summary(
        db: Session,
        logger: logging.Logger,
        account_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        group_by: str = "month"
    ) -> List[dict]:
        
        # 1. Timeline resolution
        if group_by == "day":
            date_format = "%Y-%m-%d"
        elif group_by == "year":
            date_format = "%Y"
        else:
            date_format = "%Y-%m"

        period_field = func.strftime(date_format, ExpenseModel.date).label("period")
        income_sum = func.sum(case((ExpenseModel.is_income == True, ExpenseModel.amount), else_=0.0))
        expense_sum = func.sum(case((ExpenseModel.is_income == False, ExpenseModel.amount), else_=0.0))

        base_filters = []
        if account_id:
            base_filters.append(ExpenseModel.account_id == account_id)
        if start_date:
            base_filters.append(ExpenseModel.date >= parse_uk_date(start_date, logger))
        if end_date:
            base_filters.append(ExpenseModel.date <= parse_uk_date(end_date, logger))

        # 2. Re-write blocks using modern select() instead of db.query()
        # --- LEVEL A: GRAND TOTALS ---
        total_query = select(
            period_field,
            literal_column("'total'").label("type"),
            literal_column("NULL").label("category_name"),
            literal_column("NULL").label("parent_name"),
            func.coalesce(income_sum, 0.0).label("total_income"),
            func.coalesce(expense_sum, 0.0).label("total_expenses")
        ).filter(*base_filters).group_by(text("period"))

        # --- LEVEL B: PARENT CATEGORIES ---
        parent_cat_alias = aliased(CategoryModel)
        category_query = select(
            period_field,
            literal_column("'category'").label("type"),
            func.coalesce(parent_cat_alias.name, literal_column("'Uncategorized'")).label("category_name"),
            literal_column("NULL").label("parent_name"),
            func.coalesce(income_sum, 0.0).label("total_income"),
            func.coalesce(expense_sum, 0.0).label("total_expenses")
        ).outerjoin(CategoryModel, ExpenseModel.category_id == CategoryModel.id)\
         .outerjoin(parent_cat_alias, case((CategoryModel.parent_id.isnot(None), CategoryModel.parent_id), else_=CategoryModel.id) == parent_cat_alias.id)\
         .filter(*base_filters)\
         .group_by(text("period"), text("category_name"))

        # --- LEVEL C: SUBCATEGORIES ---
        subcategory_query = select(
            period_field,
            literal_column("'subcategory'").label("type"),
            CategoryModel.name.label("category_name"),
            parent_cat_alias.name.label("parent_name"),
            func.coalesce(income_sum, 0.0).label("total_income"),
            func.coalesce(expense_sum, 0.0).label("total_expenses")
        ).join(CategoryModel, ExpenseModel.category_id == CategoryModel.id)\
         .join(parent_cat_alias, CategoryModel.parent_id == parent_cat_alias.id)\
         .filter(*base_filters)\
         .group_by(text("period"), text("category_name"), text("parent_name"))

        # 3. Combine flat select criteria using standalone union_all
        combined = union_all(total_query, category_query, subcategory_query)
        
        # 4. Execute the statement with clean sorting properties
        raw_results = db.execute(combined.order_by(text("period"), text("type"))).mappings().all()

        return [dict(row) for row in raw_results]