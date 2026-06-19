# app/models/category_rules.py
from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database.session import Base

class CategoryRule(Base):
    __tablename__ = "category_rules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    keyword: Mapped[str] = mapped_column(String, index=True, nullable=False) # string to look for (e.g., "starbucks", "tfl")
    target_category: Mapped[str] = mapped_column(String, nullable=False)
    match_field: Mapped[str] = mapped_column(String, default="description", nullable=False)

    __table_args__ = (
        UniqueConstraint('keyword', 'match_field', name='uq_keyword_match_field'),
    )