"""
Tests for the Expense model.
"""
import pytest
from app.models.expense import Expense


class TestExpenseModel:
    """Test suite for the Expense SQLAlchemy model."""
    
    def test_expense_model_creation(self, db_session):
        """Test creating an Expense record in the database."""
        expense = Expense(
            account_id="acc_001",
            date="2024-01-01",
            amount=50.00,
            is_income=False,
            description="Grocery Store",
            category="Food",
            transaction_hash="abc123def456"
        )
        db_session.add(expense)
        db_session.commit()
        
        result = db_session.query(Expense).filter(
            Expense.transaction_hash == "abc123def456"
        ).first()
        
        assert result is not None
        assert result.amount == 50.00
        assert result.is_income is False
        assert result.description == "Grocery Store"
        assert result.account_id == "acc_001"
    
    def test_expense_default_category(self, db_session):
        """Test that category defaults to 'Uncategorized'."""
        expense = Expense(
            account_id="acc_001",
            date="2024-01-01",
            amount=100.00,
            is_income=False,
            description="Test",
            transaction_hash="test_hash_001"
        )
        db_session.add(expense)
        db_session.commit()
        
        result = db_session.query(Expense).filter(
            Expense.transaction_hash == "test_hash_001"
        ).first()
        
        assert result.category == "Uncategorized"
    
    def test_expense_is_income_flag(self, db_session):
        """Test is_income flag for income transactions."""
        income = Expense(
            account_id="acc_001",
            date="2024-01-01",
            amount=2000.00,
            is_income=True,
            description="Salary",
            transaction_hash="income_hash_001"
        )
        db_session.add(income)
        db_session.commit()
        
        result = db_session.query(Expense).filter(
            Expense.transaction_hash == "income_hash_001"
        ).first()
        
        assert result.is_income is True
    
    def test_expense_unique_transaction_hash(self, db_session):
        """Test that transaction_hash is unique."""
        expense1 = Expense(
            account_id="acc_001",
            date="2024-01-01",
            amount=50.00,
            is_income=False,
            description="Test 1",
            transaction_hash="unique_hash_001"
        )
        db_session.add(expense1)
        db_session.commit()
        
        # Attempting to add a duplicate hash should raise an error
        from sqlalchemy.exc import IntegrityError
        
        expense2 = Expense(
            account_id="acc_001",
            date="2024-01-01",
            amount=50.00,
            is_income=False,
            description="Test 2",
            transaction_hash="unique_hash_001"  # Same hash
        )
        db_session.add(expense2)
        
        with pytest.raises(IntegrityError):
            db_session.commit()
    
    def test_expense_query_by_category(self, db_session):
        """Test querying expenses by category."""
        expense1 = Expense(
            account_id="acc_001",
            date="2024-01-01",
            amount=50.00,
            is_income=False,
            description="Pizza",
            category="Food",
            transaction_hash="food_hash_001"
        )
        expense2 = Expense(
            account_id="acc_001",
            date="2024-01-02",
            amount=30.00,
            is_income=False,
            description="Gas",
            category="Transportation",
            transaction_hash="trans_hash_001"
        )
        db_session.add_all([expense1, expense2])
        db_session.commit()
        
        food_expenses = db_session.query(Expense).filter(
            Expense.category == "Food"
        ).all()
        
        assert len(food_expenses) == 1
        assert food_expenses[0].description == "Pizza"
