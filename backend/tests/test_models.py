"""
Tests for SQLAlchemy models.
"""
import pytest
import datetime
from sqlalchemy.exc import IntegrityError
from app.models.expense import Expense
from app.models.bank_account import BankAccount
from app.models.category import Category


class TestExpenseModel:
    """Test suite for the Expense SQLAlchemy model."""

    def _make_account(self, db_session) -> BankAccount:
        acc = BankAccount(
            account_name="Test Account",
            bank_name="Test Bank",
            amount_style="single_column",
            invert_amounts=False,
            mappings={"date_column": "Date", "description_column": "Description", "amount_column": "Amount"},
        )
        db_session.add(acc)
        db_session.flush()
        return acc

    def test_expense_model_creation(self, db_session):
        """Test creating an Expense record in the database."""
        acc = self._make_account(db_session)
        expense = Expense(
            account_id=acc.id,
            date=datetime.date(2024, 1, 1),
            amount=50.00,
            is_income=False,
            description="Grocery Store",
            transaction_hash="abc123def456",
        )
        db_session.add(expense)
        db_session.commit()

        result = db_session.query(Expense).filter(Expense.transaction_hash == "abc123def456").first()
        assert result is not None
        assert result.amount == 50.00
        assert result.is_income is False
        assert result.description == "Grocery Store"
        assert result.account_id == acc.id

    def test_expense_default_category_is_null(self, db_session):
        """Test that category_id defaults to NULL (uncategorized)."""
        acc = self._make_account(db_session)
        expense = Expense(
            account_id=acc.id,
            date=datetime.date(2024, 1, 1),
            amount=100.00,
            is_income=False,
            description="Test",
            transaction_hash="test_hash_001",
        )
        db_session.add(expense)
        db_session.commit()

        result = db_session.query(Expense).filter(Expense.transaction_hash == "test_hash_001").first()
        assert result.category_id is None

    def test_expense_is_income_flag(self, db_session):
        """Test is_income flag for income transactions."""
        acc = self._make_account(db_session)
        income = Expense(
            account_id=acc.id,
            date=datetime.date(2024, 1, 1),
            amount=2000.00,
            is_income=True,
            description="Salary",
            transaction_hash="income_hash_001",
        )
        db_session.add(income)
        db_session.commit()

        result = db_session.query(Expense).filter(Expense.transaction_hash == "income_hash_001").first()
        assert result.is_income is True

    def test_expense_unique_transaction_hash(self, db_session):
        """Test that transaction_hash enforces uniqueness."""
        acc = self._make_account(db_session)
        db_session.add(Expense(
            account_id=acc.id,
            date=datetime.date(2024, 1, 1),
            amount=50.00,
            is_income=False,
            description="Test 1",
            transaction_hash="unique_hash_001",
        ))
        db_session.commit()

        db_session.add(Expense(
            account_id=acc.id,
            date=datetime.date(2024, 1, 1),
            amount=50.00,
            is_income=False,
            description="Test 2",
            transaction_hash="unique_hash_001",
        ))
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_expense_category_relationship(self, db_session):
        """Test linking an expense to a category via FK."""
        acc = self._make_account(db_session)
        cat = Category(name="Food", icon="🍔")
        db_session.add(cat)
        db_session.flush()

        expense = Expense(
            account_id=acc.id,
            date=datetime.date(2024, 1, 1),
            amount=12.50,
            is_income=False,
            description="Lunch",
            transaction_hash="cat_hash_001",
            category_id=cat.id,
        )
        db_session.add(expense)
        db_session.commit()

        result = db_session.query(Expense).filter(Expense.transaction_hash == "cat_hash_001").first()
        assert result.category_id == cat.id
