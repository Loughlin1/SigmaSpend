from pydantic import BaseModel, Field
from typing import Optional

class CategoryRuleBase(BaseModel):
    # The keyword to watch for in the bank statement description
    keyword: str = Field(..., description="The substring search keyword, e.g., 'Starbucks'")
    # The exact category or subcategory name assigned when matched
    target_category: str = Field(..., description="The name of the destination category")

class CategoryRuleCreate(CategoryRuleBase):
    """
    Validation schema used when a client posts a new rule configuration payload.
    """
    pass

class CategoryRuleUpdate(BaseModel):
    """
    Allows partial rule updates (e.g., changing only the destination category target).
    """
    keyword: Optional[str] = None
    target_category: Optional[str] = None

class CategoryRuleResponse(CategoryRuleBase):
    """
    The structured data shape returned to the React frontend client.
    Includes the database primary key ID.
    """
    id: int

    class Config:
        from_attributes = True  # Allows Pydantic to read SQLAlchemy models natively