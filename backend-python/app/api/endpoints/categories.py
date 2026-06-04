from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api import deps
from app.models.category import Category as CategoryModel
from app.schemas.category import CategoryCreate, CategoryResponse

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
def read_categories(db: Session = Depends(deps.get_db)):
    return db.query(CategoryModel).order_by(CategoryModel.name.asc()).all()

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(category_in: CategoryCreate, db: Session = Depends(deps.get_db)):
    # Standardise to Title Case for uniform display
    normalized_name = category_in.name.strip().title()
    
    # Prevent duplicate categories
    existing = db.query(CategoryModel).filter(CategoryModel.name == normalized_name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category already exists."
        )
        
    db_obj = CategoryModel(name=normalized_name)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj