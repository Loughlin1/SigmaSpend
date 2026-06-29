from typing import Optional
from fastapi import APIRouter, Depends, Query
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
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    logger.info(f"Fetching category rules: q={q}, page={page}, page_size={page_size}")
    items, total_count = RuleService.list_paginated(db, q=q, page=page, page_size=page_size)
    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "pages": (total_count + page_size - 1) // page_size if total_count > 0 else 1,
    }


@router.post("/", response_model=CategoryRuleResponse, status_code=201)
def create_rule(rule_in: CategoryRuleCreate, db: Session = Depends(deps.get_db)):
    return RuleService.create(db, rule_in)


@router.delete("/{rule_id}", status_code=204)
def delete_rule(rule_id: int, db: Session = Depends(deps.get_db)):
    RuleService.delete(db, rule_id)
    return None
