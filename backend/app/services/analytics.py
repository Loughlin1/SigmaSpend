# backend/app/services/analytics.py
from typing import List, Optional
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, case, literal_column, text, union_all, select  # <-- Add select here
import logging
from datetime import datetime

from app.models.expense import Expense as ExpenseModel
from app.models.category import Category as CategoryModel


class ExpenseAnalyticsService:
    @staticmethod
    def get_multi_tier_summary(
        db: Session,
        logger: logging.Logger,
        account_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        group_by: str = "month",
        holiday_id: Optional[int] = None,
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
        if holiday_id is not None:
            base_filters.append(ExpenseModel.holiday_id == holiday_id)

        if start_date:
            try:
                start_dt = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
                base_filters.append(ExpenseModel.date >= start_dt)
            except ValueError:
                logger.error(f"Analytics unexpected start_date format received: {start_date}")

        if end_date:
            try:
                end_dt = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
                base_filters.append(ExpenseModel.date <= end_dt)
            except ValueError:
                logger.error(f"Analytics unexpected end_date format received: {end_date}")

        # 2. Re-write blocks using modern select() instead of db.query()
        # --- LEVEL A: GRAND TOTALS ---
        total_query = select(
            period_field,
            literal_column("'total'").label("type"),
            literal_column("NULL").label("category_name"),
            literal_column("NULL").label("parent_name"),
            func.coalesce(income_sum, 0.0).label("total_income"),
            func.coalesce(expense_sum, 0.0).label("total_expenses")
        ).filter(*base_filters).group_by(period_field)

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
         .group_by(period_field, text("category_name"))

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
         .group_by(period_field, text("category_name"), text("parent_name"))

        # 3. Combine flat select criteria using standalone union_all
        combined = union_all(total_query, category_query, subcategory_query)
        
        # 4. Execute the statement with clean sorting properties
        raw_results = db.execute(combined.order_by(period_field, text("type"))).mappings().all()

        results = []
        for row in raw_results:
            d = dict(row)
            d["net"] = round(float(d.get("total_income", 0)) - float(d.get("total_expenses", 0)), 2)
            results.append(d)
        return results