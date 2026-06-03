from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.database.session import Base

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String, unique=True, index=True, nullable=False)  # e.g., "checking_001"
    account_name = Column(String, nullable=False)  # e.g., "My Checking Account"
    bank_name = Column(String, nullable=False)  # e.g., "Chase", "Wells Fargo"
    
    # Bank config profile reference
    bank_profile = Column(String, nullable=False)  # Maps to config.yaml bank profile name
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True, index=True)
