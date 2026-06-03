from pydantic import BaseModel
from typing import Optional

# Properties shared across all states
class ExpenseBase(BaseModel):
    amount: float
    category: Optional[str] = "Uncategorized"
    description: str
    date: str

# Properties received via API on manual creation
class ExpenseCreate(ExpenseBase):
    pass

# Properties returned to the React frontend client
class ExpenseResponse(ExpenseBase):
    id: int
    transaction_hash: str

    class Config:
        from_attributes = True  # Allows Pydantic to read SQLAlchemy models natively