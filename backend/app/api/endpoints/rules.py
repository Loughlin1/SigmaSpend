from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.category_rules import CategoryRuleCreate, CategoryRuleResponse, PaginatedCategoryRuleResponse
from app.services.rule import RuleService

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.get("/", response_model=PaginatedCategoryRuleResponse)
def read_rules(
    db: Session = Depends(deps.get_db),
    q: Optional[str] = Query(None, description="Search keyword trigger or category name"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
):
    logger.info(f"Fetching category rules with search filter: q={q}, page={page}, page_size={page_size}")
    items, total_count = RuleService.list_paginated(db, q=q, page=page, page_size=page_size)
    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "pages": (total_count + page_size - 1) // page_size if total_count > 0 else 1,
    }


@router.post("/", response_model=CategoryRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(rule_in: CategoryRuleCreate, db: Session = Depends(deps.get_db)):
    normalized_keyword = rule_in.keyword.strip().lower()
    target_field = rule_in.match_field.strip().lower()

    if not RuleService.get_category(db, rule_in.category_id):
        logger.warning(f"Failed to create category rule: Category ID {rule_in.category_id} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target category ID {rule_in.category_id} does not exist.",
        )

    if RuleService.find_duplicate(db, normalized_keyword, target_field):
        logger.warning(
            f"Failed to create category rule: Rule for keyword '{normalized_keyword}' "
            f"matching on field '{target_field}' already exists."
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A rule for this keyword already exists.",
        )

    return RuleService.create(db, rule_in)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: int, db: Session = Depends(deps.get_db)):
    rule = RuleService.get_by_id(db, rule_id)
    if not rule:
        logger.warning(f"Delete rule failed: Rule ID {rule_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    RuleService.delete(db, rule)
    return None
