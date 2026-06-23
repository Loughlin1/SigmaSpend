# app/models/bank_account.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.session import Base

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_name = Column(String, nullable=False)  # e.g., "My Checking Account"
    bank_name = Column(String, nullable=False)  # e.g., "Chase", "Wells Fargo"

    amount_style = Column(String, nullable=False, default="single_column")
    invert_amounts = Column(Boolean, default=False, nullable=False)
    mappings = Column(JSON, nullable=False)

    expenses = relationship("Expense", back_populates="account_rel", cascade="all, delete-orphan")

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True, index=True)
