from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BankAccountBase(BaseModel):
    account_id: str
    account_name: str
    bank_name: str
    bank_profile: str  # Reference to config.yaml profile name

class BankAccountCreate(BankAccountBase):
    pass

class BankAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    is_active: Optional[bool] = None

class BankAccountResponse(BankAccountBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True
