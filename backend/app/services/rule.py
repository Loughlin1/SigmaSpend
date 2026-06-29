import logging
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session, joinedload

from app.models.category_rules import CategoryRule
from app.models.category import Category
from app.schemas.category_rules import CategoryRuleCreate
from app.exceptions import CategoryNotFoundError, DuplicateRuleError, RuleNotFoundError

logger = logging.getLogger("sigmaspend")

_CATEGORY_REL = CategoryRule.category_rel if hasattr(CategoryRule, "category_rel") else CategoryRule.category


class RuleService:
    @staticmethod
    def list_paginated(
        db: Session,
        q: Optional[str] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[CategoryRule], int]:
        query = db.query(CategoryRule)

        if q:
            search_term = f"%{q.strip().lower()}%"
            query = query.join(Category).filter(
                (CategoryRule.keyword.ilike(search_term)) |
                (Category.name.ilike(search_term))
            )

        total_count = query.count()
        offset = (page - 1) * page_size
        items = (
            query.options(joinedload(_CATEGORY_REL))
            .order_by(CategoryRule.keyword)
            .offset(offset)
            .limit(page_size)
            .all()
        )
        return items, total_count

    @staticmethod
    def create(db: Session, rule_in: CategoryRuleCreate) -> CategoryRule:
        normalized_keyword = rule_in.keyword.strip().lower()
        target_field = rule_in.match_field.strip().lower()

        if not db.query(Category).filter(Category.id == rule_in.category_id).first():
            raise CategoryNotFoundError(f"Target category ID {rule_in.category_id} does not exist.")

        if db.query(CategoryRule).filter(
            CategoryRule.keyword == normalized_keyword,
            CategoryRule.match_field == target_field,
        ).first():
            raise DuplicateRuleError("A rule for this keyword already exists.")

        rule_data = rule_in.dict()
        rule_data["keyword"] = normalized_keyword
        rule_data["match_field"] = target_field

        db_obj = CategoryRule(**rule_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        logger.info(
            f"Successfully created rule ID {db_obj.id} -> '{normalized_keyword}' "
            f"({target_field}) maps to Category ID {db_obj.category_id}"
        )

        return db.query(CategoryRule).options(
            joinedload(_CATEGORY_REL)
        ).filter(CategoryRule.id == db_obj.id).first()

    @staticmethod
    def get_by_id(db: Session, rule_id: int) -> CategoryRule:
        rule = db.query(CategoryRule).filter(CategoryRule.id == rule_id).first()
        if not rule:
            raise RuleNotFoundError(f"Rule '{rule_id}' not found")
        return rule

    @staticmethod
    def delete(db: Session, rule_id: int) -> None:
        rule = RuleService.get_by_id(db, rule_id)
        db.delete(rule)
        db.commit()
        logger.info(f"Permanently deleted category rule ID {rule_id}")
