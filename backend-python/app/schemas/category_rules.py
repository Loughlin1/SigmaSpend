# app/schemas/category_rules.py
from pydantic import BaseModel, Field, computed_field
from typing import Optional

class CategoryRuleBase(BaseModel):
    keyword: str = Field(..., description="The substring search keyword, e.g., 'Starbucks'")
    match_field: str = Field("description", description="Must be either 'description' or 'notes'")

class CategoryRuleCreate(CategoryRuleBase):
    """
    Validation schema used when a client posts a new rule configuration payload.
    """
    target_category: str = Field(..., description="The name of the destination category")

class CategoryRuleUpdate(BaseModel):
    """
    Allows partial rule updates (e.g., changing only the destination category target).
    """
    keyword: Optional[str] = None
    target_category: Optional[str] = None

class CategoryRuleResponse(CategoryRuleBase):
    """
    The structured data shape returned to the React frontend client.
    """
    id: int
    category_id: int = Field(..., description="The internal structural database ID")

    # This dynamically injects 'target_category' into the JSON response body
    # by reading the SQLAlchemy relationship string name.
    @computed_field
    def target_category(self) -> str:
        return self.category.name if hasattr(self, "category") and self.category else ""

    class Config:
        from_attributes = True  # Allows Pydantic to read SQLAlchemy models natively