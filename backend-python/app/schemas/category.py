# app/schemas/category.py
from pydantic import BaseModel
from typing import List, Optional, Literal

BUCKET_VALUES = Literal['50_needs', '30_wants', '20_savings']

class CategoryBase(BaseModel):
    name: str
    icon: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryBucketUpdate(BaseModel):
    bucket: Optional[BUCKET_VALUES] = None

# Forward reference declaration for nesting subcategories
class CategoryResponse(CategoryBase):
    id: int
    bucket: Optional[str] = None
    subcategories: List['CategoryResponse'] = []

    class Config:
        from_attributes = True
