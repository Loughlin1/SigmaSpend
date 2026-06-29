# backend/app/api/endpoints/categories.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.category import Category as CategoryModel
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryBucketUpdate

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
def read_categories(db: Session = Depends(deps.get_db)):
    # Only fetch root categories; subcategories are nested automatically
    logger.info("Fetching all root categories")
    return db.query(CategoryModel).filter(CategoryModel.parent_id == None).order_by(CategoryModel.name.asc()).all()

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(category_in: CategoryCreate, db: Session = Depends(deps.get_db)):
    normalized_name = category_in.name.strip().title()
    
    # Check for duplicates
    existing = db.query(CategoryModel).filter(
        CategoryModel.name == normalized_name,
    ).first()
    
    if existing:
        logger.warning(
            f"Failed to create category: Duplicate name '{normalized_name}' "
            f"under parent_id={category_in.parent_id}"
        )
        raise HTTPException(status_code=400, detail="This category or subcategory already exists here.")
        
    db_obj = CategoryModel(name=normalized_name, parent_id=category_in.parent_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    logger.info(f"Successfully created category '{db_obj.name}' with ID {db_obj.id}")
    return db_obj


@router.patch("/{category_id}/bucket", response_model=CategoryResponse)
def update_bucket(category_id: int, payload: CategoryBucketUpdate, db: Session = Depends(deps.get_db)):
    cat = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
    if not cat:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Category not found")
    cat.bucket = payload.bucket
    db.commit()
    db.refresh(cat)
    logger.info(
        f"Set bucket='{payload.bucket}' on category '{cat.name}' (id={category_id})",
        extra={"payload": {"category_id": category_id, "category_name": cat.name, "bucket": payload.bucket}},
    )
    return cat