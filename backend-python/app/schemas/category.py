# app/schemas/category.py
from pydantic import BaseModel
from typing import List, Optional

class CategoryBase(BaseModel):
    name: str
    icon: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

# Forward reference declaration for nesting subcategories
class CategoryResponse(CategoryBase):
    id: int
    subcategories: List['CategoryResponse'] = []

    class Config:
        from_attributes = True