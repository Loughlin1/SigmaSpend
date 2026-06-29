from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryBucketUpdate
from app.services.category import CategoryService

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.get("/", response_model=List[CategoryResponse])
def read_categories(db: Session = Depends(deps.get_db)):
    logger.info("Fetching all root categories")
    return CategoryService.list_root(db)


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(category_in: CategoryCreate, db: Session = Depends(deps.get_db)):
    normalized_name = category_in.name.strip().title()

    if CategoryService.find_by_name(db, normalized_name):
        logger.warning(
            f"Failed to create category: Duplicate name '{normalized_name}' "
            f"under parent_id={category_in.parent_id}"
        )
        raise HTTPException(status_code=400, detail="This category or subcategory already exists here.")

    return CategoryService.create(db, normalized_name, category_in.parent_id)


@router.patch("/{category_id}/bucket", response_model=CategoryResponse)
def update_bucket(category_id: int, payload: CategoryBucketUpdate, db: Session = Depends(deps.get_db)):
    cat = CategoryService.get_by_id(db, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return CategoryService.update_bucket(db, cat, payload.bucket)
