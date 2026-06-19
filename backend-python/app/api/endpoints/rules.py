# app/api/endpoints/rules.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.api import deps

from app.models.category_rules import CategoryRule
from app.models.category import Category
from app.schemas.category_rules import CategoryRuleCreate, CategoryRuleResponse

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.get("/", response_model=List[CategoryRuleResponse])
def read_rules(
    db: Session = Depends(deps.get_db),
    q: Optional[str] = Query(None, description="Search keyword trigger or category name")
):
    logger.info(f"Fetching category rules with search filter: q={q}")
    
    # Eager load the category model context
    relationship_to_load = (
        CategoryRule.category_rel if hasattr(CategoryRule, "category_rel") else CategoryRule.category
    )
    query = db.query(CategoryRule).options(joinedload(relationship_to_load))

    if q:
        search_term = f"%{q.strip().lower()}%"
        # Search against either the rule keyword or join on the Category table to match category names
        query = query.join(Category).filter(
            (CategoryRule.keyword.ilike(search_term)) |
            (Category.name.ilike(search_term))
        )

    return query.order_by(CategoryRule.keyword).all()


@router.post("/", response_model=CategoryRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(rule_in: CategoryRuleCreate, db: Session = Depends(deps.get_db)):
    normalized_keyword = rule_in.keyword.strip().lower()
    target_field = rule_in.match_field.strip().lower()

    # 1. Look up the Category row via its structural internal ID directly
    category = db.query(Category).filter(Category.id == rule_in.category_id).first()
    if not category:
        logger.warning(f"Failed to create category rule: Category ID {rule_in.category_id} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target category ID {rule_in.category_id} does not exist."
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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="A rule for this keyword already exists."
        )
        
    # 3. Instantiate the model using the validated schema dictionary payload
    rule_data = rule_in.dict()
    rule_data["keyword"] = normalized_keyword
    rule_data["match_field"] = target_field
    
    db_obj = CategoryRule(**rule_data)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    logger.info(
        f"Successfully created rule ID {db_obj.id} -> '{normalized_keyword}' "
        f"({target_field}) maps to Category ID {db_obj.category_id} ({category.name})"
    )
    
    # 4. Fetch the object with its eager-loaded relationship block so the 
    # computed field in the response schema can safely access category metadata.
    relationship_to_load = (
        CategoryRule.category_rel 
        if hasattr(CategoryRule, "category_rel") 
        else CategoryRule.category
    )
    
    return db.query(CategoryRule).options(
        joinedload(relationship_to_load)
    ).filter(CategoryRule.id == db_obj.id).first()


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: int, db: Session = Depends(deps.get_db)):
    rule = db.query(CategoryRule).filter(CategoryRule.id == rule_id).first()
    if not rule:
        logger.warning(f"Delete rule failed: Rule ID {rule_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
        
    db.delete(rule)
    db.commit()
    
    logger.info(f"Permanently deleted category rule ID {rule_id}")
    return None