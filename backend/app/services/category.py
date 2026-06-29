import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.category import Category as CategoryModel
from app.exceptions import CategoryNotFoundError, DuplicateCategoryError

logger = logging.getLogger("sigmaspend")


class CategoryService:
    @staticmethod
    def list_root(db: Session) -> List[CategoryModel]:
        return (
            db.query(CategoryModel)
            .filter(CategoryModel.parent_id == None)
            .order_by(CategoryModel.name.asc())
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, category_id: int) -> CategoryModel:
        cat = db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
        if not cat:
            raise CategoryNotFoundError(f"Category '{category_id}' not found")
        return cat

    @staticmethod
    def create(db: Session, name: str, parent_id: Optional[int] = None) -> CategoryModel:
        if db.query(CategoryModel).filter(CategoryModel.name == name).first():
            raise DuplicateCategoryError("This category or subcategory already exists here.")
        db_obj = CategoryModel(name=name, parent_id=parent_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Successfully created category '{db_obj.name}' with ID {db_obj.id}")
        return db_obj

    @staticmethod
    def update_bucket(db: Session, category_id: int, bucket: str) -> CategoryModel:
        cat = CategoryService.get_by_id(db, category_id)
        cat.bucket = bucket
        db.commit()
        db.refresh(cat)
        logger.info(
            f"Set bucket='{bucket}' on category '{cat.name}' (id={category_id})",
            extra={"payload": {"category_id": category_id, "category_name": cat.name, "bucket": bucket}},
        )
        return cat
