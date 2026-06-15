from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import date

# Properties shared across all states
class ExpenseBase(BaseModel):
    amount: float
    is_income: bool
    category: Optional[str] = "Uncategorized"
    description: str
    notes: str
    date: date
    account_id: str

    # Converts Python date objects directly to UK format strings for JSON payloads
    @field_serializer('date')
    def serialize_date(self, dt: date, _info) -> str:
        return dt.strftime("%d/%m/%Y")  # Outputs: "04/06/2026"

# Properties received via API on manual creation
class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(ExpenseBase):
    pass


# Properties returned to the React frontend client
class ExpenseResponse(ExpenseBase):
    id: int
    transaction_hash: str

    class Config:
        from_attributes = True  # Allows Pydantic to read SQLAlchemy models natively