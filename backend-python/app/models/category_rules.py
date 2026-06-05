from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.session import Base

class CategoryRule(Base):
    __tablename__ = "category_rules"

    id = Column(Integer, primary_key=True, index=True)
    # The string to look for in the CSV row (e.g., "starbucks", "tfl", "lloyds")
    keyword = Column(String, unique=True, index=True, nullable=False)
    # The specific string name of the target category or subcategory to assign
    target_category = Column(String, nullable=False)