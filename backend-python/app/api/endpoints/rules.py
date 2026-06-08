# app/api/endpoints/rules.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.category_rules import CategoryRuleBase as RuleModel, CategoryRuleCreate, CategoryRuleResponse

router = APIRouter()

@router.get("/", response_model=List[CategoryRuleResponse])
def read_rules(db: Session = Depends(deps.get_db)):
    return db.query(RuleModel).order_by(RuleModel.keyword.asc()).all()

@router.post("/", response_model=CategoryRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(rule_in: CategoryRuleCreate, db: Session = Depends(deps.get_db)):
    normalized_keyword = rule_in.keyword.strip().lower()
    existing = db.query(RuleModel).filter(RuleModel.keyword == normalized_keyword).first()
    if existing:
        raise HTTPException(status_code=400, detail="A rule for this keyword already exists.")
        
    db_obj = RuleModel(keyword=normalized_keyword, target_category=rule_in.target_category)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: int, db: Session = Depends(deps.get_db)):
    rule = db.query(RuleModel).filter(RuleModel.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()