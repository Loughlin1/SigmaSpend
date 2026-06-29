from pydantic import BaseModel, condecimal
from typing import Optional
from datetime import datetime


class IncomeSettingsUpdate(BaseModel):
    monthly_net_income: condecimal(max_digits=10, decimal_places=2)


class IncomeSettingsResponse(BaseModel):
    id: int
    monthly_net_income: float
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
