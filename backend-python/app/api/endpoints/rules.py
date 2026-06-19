# app/api/endpoints/rules.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.api import deps

from app.models.category_rules import CategoryRule
from app.models.category import Category
from app.schemas.category_rules import CategoryRuleCreate, CategoryRuleResponse

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.get("/", response_model=List[CategoryRuleResponse])
def read_rules(db: Session = Depends(deps.get_db)):
    logger.info("Fetching all category rules")
    # Using joinedload ensures the category relationship is loaded in memory
    # so Pydantic's @computed_field can instantly read the category name.
    return db.query(CategoryRule).options(joinedload(CategoryRule.category)).order_by(CategoryRule.keyword).all()


@router.post("/", response_model=CategoryRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(rule_in: CategoryRuleCreate, db: Session = Depends(deps.get_db)):
    normalized_keyword = rule_in.keyword.strip().lower()
    target_field = rule_in.match_field.strip().lower()

    # 1. Look up the Category row via the string name sent by the frontend
    category = db.query(Category).filter(Category.name.ilike(rule_in.target_category.strip())).first()
    if not category:
        logger.warning(f"Failed to create category rule: Category '{rule_in.target_category}' not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target category '{rule_in.target_category}' does not exist."
        )

    # 2. Check for duplicate unique constraint pairs (keyword + match_field)
    existing = db.query(CategoryRule).filter(
        CategoryRule.keyword == normalized_keyword,
        CategoryRule.match_field == target_field
    ).first()

    if existing:
        logger.warning(
            f"Failed to create category rule: Rule for keyword '{normalized_keyword}' "
            f"matching on field '{target_field}' already exists."
        )
        raise HTTPException(status_code=400, detail="A rule for this keyword already exists.")
        
    # 3. Instantiate the model using the foreign key integer ID
    db_obj = CategoryRule(
        keyword=normalized_keyword, 
        category_id=category.id,  # Set the structural relation ID safely
        match_field=target_field
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    logger.info(
        f"Successfully created rule ID {db_obj.id} -> '{normalized_keyword}' "
        f"({target_field}) maps to Category ID {db_obj.category_id} ({category.name})"
    )
    return db_obj


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: int, db: Session = Depends(deps.get_db)):
    rule = db.query(CategoryRule).filter(CategoryRule.id == rule_id).first()
    if not rule:
        logger.warning(f"Delete rule failed: Rule ID {rule_id} not found.")
        raise HTTPException(status_code=404, detail="Rule not found")
        
    db.delete(rule)
    db.commit()
    
    logger.info(f"Permanently deleted category rule ID {rule_id}")
    return None