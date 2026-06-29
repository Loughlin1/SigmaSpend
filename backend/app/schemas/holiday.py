from pydantic import BaseModel
from typing import Optional
from datetime import date

class HolidayBase(BaseModel):
    name: str
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    flag: Optional[str] = None

class HolidayCreate(HolidayBase):
    pass

class HolidayUpdate(HolidayBase):
    pass

class HolidayResponse(HolidayBase):
    id: int
    expense_count: Optional[int] = 0
    total_spend: Optional[float] = 0.0

    class Config:
        from_attributes = True
