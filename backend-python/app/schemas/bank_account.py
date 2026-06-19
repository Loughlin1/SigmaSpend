# app/schemas/bank_account.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class BankAccountBase(BaseModel):
    account_id: str
    account_name: str
    bank_name: str
    amount_style: str = "single_column"
    mappings: Dict[str, Any]
    bank_profile: Optional[str] = None  # Optional legacy reference to config.yaml profile name

class BankAccountCreate(BankAccountBase):
    pass

class BankAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    amount_style: Optional[str] = None
    mappings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class BankAccountResponse(BankAccountBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

    class Config:
        from_attributes = True
