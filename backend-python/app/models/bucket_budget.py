from sqlalchemy import Column, String, Numeric, DateTime
from sqlalchemy.sql import func
from app.database.session import Base


class BucketBudget(Base):
    __tablename__ = "bucket_budgets"

    bucket_key = Column(String, primary_key=True)
    amount = Column(Numeric(10, 2), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
