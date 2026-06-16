# app/api/endpoints/rules.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps

from app.models.category_rules import CategoryRule
from app.schemas.category_rules import CategoryRuleCreate, CategoryRuleResponse

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.get("/", response_model=List[CategoryRuleResponse])
def read_rules(db: Session = Depends(deps.get_db)):
    logger.info("Fetching all category rules")
    return db.query(CategoryRule).order_by(CategoryRule.keyword).all()


@router.post("/", response_model=CategoryRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(rule_in: CategoryRuleCreate, db: Session = Depends(deps.get_db)):
    normalized_keyword = rule_in.keyword.strip().lower()
    target_field = rule_in.match_field.strip().lower() # Read incoming description/notes choice

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
        
    db_obj = CategoryRule(
        keyword=normalized_keyword, 
        target_category=rule_in.target_category,
        match_field=target_field
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    logger.info(
        f"Successfully created rule ID {db_obj.id} -> '{normalized_keyword}' "
        f"({target_field}) maps to '{db_obj.target_category}'"
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