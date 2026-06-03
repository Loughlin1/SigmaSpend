from sqlalchemy import Column, Integer, Float, String, Boolean
from app.database.session import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    is_income = Column(Boolean, default=False, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, default="Uncategorized", index=True)
    
    # Enforces database-level structural constraint to guarantee no duplicates
    transaction_hash = Column(String, unique=True, index=True, nullable=False)