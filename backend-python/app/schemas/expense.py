# app/schemas/expense.py
import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, field_serializer, Field, model_validator

class ExpenseBase(BaseModel):
    account_id: int
    date: datetime.date
    amount: float
    is_income: bool = False
    description: str
    notes: Optional[str] = None
    category_id: Optional[int] = None

    # Converts Python date objects directly to UK format strings for JSON payloads
    @field_serializer('date')
    def serialize_date(self, dt: datetime.date, _info) -> str:
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
    category_metadata: Dict[str, Any] = Field(
        default={
            "name": "Uncategorized",
            "is_subcategory": False,
            "parent_name": "Uncategorized",
            "full_path": "Uncategorized"
        }
    )

    class Config:
        from_attributes = True  # Allows Pydantic to read SQLAlchemy models natively
    
    @model_validator(mode="before")
    @classmethod
    def compute_category_metadata(cls, data: Any) -> Any:
        """
        Intercepts incoming SQLAlchemy model structures before validation 
        to compile nested category relationship hierarchies into flat dictionary items.
        """
        # 1. Standardize access because 'before' can receive an object or a dict
        category_rel = getattr(data, "category_rel", None)
        
        # 2. Establish fallback dictionary layout
        metadata = {
            "name": "Uncategorized",
            "is_subcategory": False,
            "parent_name": "Uncategorized",
            "full_path": "Uncategorized"
        }

        # 3. Traverse the self-referential tree if the database relationship exists
        if category_rel:
            if getattr(category_rel, "parent_id", None) is not None and getattr(category_rel, "parent", None):
                # Target is an active Subcategory
                metadata["name"] = category_rel.name
                metadata["is_subcategory"] = True
                metadata["parent_name"] = category_rel.parent.name
                metadata["full_path"] = f"{category_rel.parent.name} > {category_rel.name}"
            else:
                # Target is a standalone Parent Category
                metadata["name"] = category_rel.name
                metadata["is_subcategory"] = False
                metadata["parent_name"] = category_rel.name
                metadata["full_path"] = category_rel.name

        # 4. Bind metadata safely onto the object structure
        if hasattr(data, "__dict__"):
            data.__dict__["category_metadata"] = metadata
        elif isinstance(data, dict):
            data["category_metadata"] = metadata

        return data

class PaginatedExpenseResponse(BaseModel):
    items: List[ExpenseResponse]
    total_count: int
    page: int
    limit: int

    class Config:
        from_attributes = True


class AnalyticalBreakdownResponse(BaseModel):
    period: str              # e.g., "2026-01" or "2026-Year"
    type: str                # "total", "category", or "subcategory"
    category_name: Optional[str] = None  # Name of the category/subcategory (None for type="total")
    parent_name: Optional[str] = None    # Direct bridge link for subcategories to group on the UI
    total_income: float
    total_expenses: float


class BulkCategoryUpdate(BaseModel):
    expense_ids: List[int]
    category_id: Optional[int] = None  # None/null means "Uncategorized"