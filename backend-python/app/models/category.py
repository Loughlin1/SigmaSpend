# app/models/category.py
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, backref
from app.database.session import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False, unique=True)
    icon = Column(String, nullable=True)
    bucket = Column(String, nullable=True)  # '50_needs' | '30_wants' | '20_savings' | None
    # If parent_id is null, it's a top-level category. If filled, it's a subcategory.
    parent_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=True)
    parent = relationship(
        "Category", 
        remote_side=[id],
        back_populates="subcategories"
    )
    subcategories = relationship(
        "Category", 
        cascade="all, delete-orphan", 
        back_populates="parent",
        lazy="joined"
    )

    rules = relationship(
        "CategoryRule", 
        back_populates="category",
        cascade="all, delete-orphan"
    )