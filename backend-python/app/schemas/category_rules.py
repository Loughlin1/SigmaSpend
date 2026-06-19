# app/schemas/category_rules.py
from pydantic import BaseModel, Field
from typing import Optional

class CategoryMinResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str] = "📁"

    class Config:
        from_attributes = True


class CategoryRuleBase(BaseModel):
    keyword: str = Field(..., description="The substring search keyword, e.g., 'Starbucks'")
    match_field: str = Field("description", description="Must be either 'description' or 'notes'")


class CategoryRuleCreate(BaseModel):
    keyword: str
    match_field: str
    category_id: int


class CategoryRuleResponse(CategoryRuleBase):
    id: int
    category_id: int
    
    category: Optional[CategoryMinResponse] = None

    class Config:
        from_attributes = True