from sqlalchemy import Column, Integer, String, Date
from sqlalchemy.orm import relationship
from app.database.session import Base

class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    destination = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    notes = Column(String, nullable=True)
    flag = Column(String, nullable=True)

    expenses = relationship("Expense", back_populates="holiday_rel")
