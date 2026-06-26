# app/models/expense.py
from typing import Optional
from sqlalchemy import Column, Integer, Float, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    is_income = Column(Boolean, default=False, nullable=False)
    description = Column(String, nullable=False)
    notes = Column(String, nullable=True)
    
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    category_rel = relationship("Category", uselist=False)

    account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False, index=True)
    account_rel = relationship("BankAccount", back_populates="expenses")

    holiday_id = Column(Integer, ForeignKey("holidays.id", ondelete="SET NULL"), nullable=True, index=True)
    holiday_rel = relationship("Holiday", back_populates="expenses")

    # Enforces database-level structural constraint to guarantee no duplicates
    transaction_hash = Column(String, unique=True, index=True, nullable=False)