import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.category import Category as CategoryModel

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
    def find_by_name(db: Session, name: str) -> Optional[CategoryModel]:
        return db.query(CategoryModel).filter(CategoryModel.name == name).first()

    @staticmethod
    def get_by_id(db: Session, category_id: int) -> Optional[CategoryModel]:
        return db.query(CategoryModel).filter(CategoryModel.id == category_id).first()

    @staticmethod
    def create(db: Session, name: str, parent_id: Optional[int] = None) -> CategoryModel:
        db_obj = CategoryModel(name=name, parent_id=parent_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Successfully created category '{db_obj.name}' with ID {db_obj.id}")
        return db_obj

    @staticmethod
    def update_bucket(db: Session, cat: CategoryModel, bucket: str) -> CategoryModel:
        cat.bucket = bucket
        db.commit()
        db.refresh(cat)
        logger.info(
            f"Set bucket='{bucket}' on category '{cat.name}' (id={cat.id})",
            extra={"payload": {"category_id": cat.id, "category_name": cat.name, "bucket": bucket}},
        )
        return cat
