from typing import List
from fastapi import APIRouter, Depends
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


@router.post("/", response_model=CategoryResponse, status_code=201)
def create_category(category_in: CategoryCreate, db: Session = Depends(deps.get_db)):
    normalized_name = category_in.name.strip().title()
    return CategoryService.create(db, normalized_name, category_in.parent_id)


@router.patch("/{category_id}/bucket", response_model=CategoryResponse)
def update_bucket(category_id: int, payload: CategoryBucketUpdate, db: Session = Depends(deps.get_db)):
    return CategoryService.update_bucket(db, category_id, payload.bucket)
