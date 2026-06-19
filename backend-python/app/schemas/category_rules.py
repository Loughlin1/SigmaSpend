# app/schemas/category_rules.py
from pydantic import BaseModel, Field, computed_field
from typing import Optional

class CategoryRuleBase(BaseModel):
    keyword: str = Field(..., description="The substring search keyword, e.g., 'Starbucks'")
    match_field: str = Field("description", description="Must be either 'description' or 'notes'")

class CategoryRuleCreate(BaseModel):
    """
    Validation schema used when a client posts a new rule configuration payload.
    Conforms to the database-level category_id design.
    """
    keyword: str = Field(..., description="The text string to look for")
    match_field: str = Field("description", description="Must be 'description' or 'notes'")
    category_id: int = Field(..., description="The internal structural database ID of the destination category")

class CategoryRuleUpdate(BaseModel):
    """
    Allows partial rule updates.
    """
    keyword: Optional[str] = None
    match_field: Optional[str] = None
    category_id: Optional[int] = None

class CategoryRuleResponse(CategoryRuleBase):
    """
    The structured data shape returned to the React frontend client.
    """
    id: int
    category_id: int = Field(..., description="The internal structural database ID")

    # This dynamically injects 'target_category' into the JSON response body
    # by reading the SQLAlchemy relationship string name to avoid breaking frontend visuals.
    @computed_field
    def target_category(self) -> str:
        # Pydantic v2 from_attributes passes the raw ORM model instance here
        if hasattr(self, "category_rel") and self.category_rel:
            return self.category_rel.name
        elif hasattr(self, "category") and self.category:
            return self.category.name
        return "Uncategorized"

    class Config:
        from_attributes = True  # Allows Pydantic to read SQLAlchemy models natively