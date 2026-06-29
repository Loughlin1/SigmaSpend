from pydantic import BaseModel, condecimal
from typing import Literal, Optional
from datetime import datetime


class BudgetUpsert(BaseModel):
    amount: condecimal(max_digits=10, decimal_places=2)
    period: Literal["monthly", "yearly"] = "monthly"


class BudgetResponse(BaseModel):
    id: int
    category_id: int
    amount: float
    period: str
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
