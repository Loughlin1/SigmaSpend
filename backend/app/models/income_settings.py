from sqlalchemy import Column, Integer, Numeric, DateTime
from sqlalchemy.sql import func
from app.database.session import Base


class IncomeSettings(Base):
    __tablename__ = "income_settings"

    id = Column(Integer, primary_key=True, index=True)
    monthly_net_income = Column(Numeric(10, 2), nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
