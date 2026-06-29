from sqlalchemy import Column, Integer, Numeric, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.session import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, unique=True)
    amount = Column(Numeric(10, 2), nullable=False)
    period = Column(String, nullable=False, default="monthly")  # 'monthly' or 'yearly'
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", backref="budget")
