# app/models/category_rules.py
from typing import TYPE_CHECKING
from sqlalchemy import String, UniqueConstraint, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base

if TYPE_CHECKING:
    from app.models.category import Category

class CategoryRule(Base):
    __tablename__ = "category_rules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    keyword: Mapped[str] = mapped_column(String, index=True, nullable=False) # string to look for (e.g., "starbucks", "tfl")
    match_field: Mapped[str] = mapped_column(String, default="description", nullable=False)

    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    category: Mapped["Category"] = relationship("Category", back_populates="rules")

    __table_args__ = (
        UniqueConstraint('keyword', 'match_field', name='uq_keyword_match_field'),
    )