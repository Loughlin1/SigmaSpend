"""
Tests for the StatementParserService.
"""
import pytest
from unittest.mock import patch, MagicMock

from app.services.ingestion.parser import StatementParserService
from app.models.expense import Expense
from app.models.bank_account import BankAccount


def _seed_account(db_session, amount_style="single_column", mappings=None) -> BankAccount:
    """Helper to create a BankAccount fixture directly in the test DB session."""
    if mappings is None:
        mappings = {"date_column": "Date", "description_column": "Description", "amount_column": "Amount"}
    acc = BankAccount(
        account_name="Test Account",
        bank_name="Test Bank",
        amount_style=amount_style,
        invert_amounts=False,
        mappings=mappings,
    )
    db_session.add(acc)
    db_session.commit()
    return acc


class TestStatementParserService:
    """Test suite for the StatementParserService."""

    def test_generate_transaction_hash_deterministic(self):
        """Test hash generation is deterministic for identical inputs."""
        h1 = StatementParserService.generate_transaction_hash(
            account_id=1, date="2024-01-01", amount=50.0,
            is_income=False, description="Test", occurrence=1,
        )
        h2 = StatementParserService.generate_transaction_hash(
            account_id=1, date="2024-01-01", amount=50.0,
            is_income=False, description="Test", occurrence=1,
        )
        assert h1 == h2
        assert len(h1) == 32  # MD5

    def test_generate_transaction_hash_different_inputs(self):
        """Test that different inputs produce different hashes."""
        h1 = StatementParserService.generate_transaction_hash(
            account_id=1, date="2024-01-01", amount=50.0,
            is_income=False, description="Test", occurrence=1,
        )
        h2 = StatementParserService.generate_transaction_hash(
            account_id=1, date="2024-01-01", amount=100.0,
            is_income=False, description="Test", occurrence=1,
        )
        assert h1 != h2

    def test_generate_transaction_hash_case_insensitive_description(self):
        """Test that description is normalised to lowercase before hashing."""
        h1 = StatementParserService.generate_transaction_hash(
            account_id=1, date="2024-01-01", amount=50.0,
            is_income=False, description="GROCERY STORE", occurrence=1,
        )
        h2 = StatementParserService.generate_transaction_hash(
            account_id=1, date="2024-01-01", amount=50.0,
            is_income=False, description="grocery store", occurrence=1,
        )
        assert h1 == h2

    def test_process_csv_single_column_format(self, db_session, sample_csv_data):
        """Test CSV processing with single column amount format."""
        acc = _seed_account(db_session)

        result = StatementParserService.process_csv(sample_csv_data, db_session, account_id=acc.id)

        assert result["added"] == 3
        assert result["skipped"] == 0
        expenses = db_session.query(Expense).all()
        assert len(expenses) == 3

        grocery = next((e for e in expenses if "Grocery" in e.description), None)
        assert grocery is not None
        assert grocery.amount == 50.00
        assert grocery.is_income is False

    def test_process_csv_split_column_format(self, db_session, sample_split_column_csv_data):
        """Test CSV processing with split debit/credit columns."""
        acc = _seed_account(
            db_session,
            amount_style="split_columns",
            mappings={
                "date_column": "Date",
                "description_column": "Description",
                "amount_out_column": "Debit",
                "amount_in_column": "Credit",
            },
        )

        result = StatementParserService.process_csv(sample_split_column_csv_data, db_session, account_id=acc.id)

        assert result["added"] == 3
        assert db_session.query(Expense).count() == 3

    def test_process_csv_duplicate_detection(self, db_session, sample_csv_data):
        """Test that re-uploading the same CSV skips all rows."""
        acc = _seed_account(db_session)

        result1 = StatementParserService.process_csv(sample_csv_data, db_session, account_id=acc.id)
        assert result1["added"] == 3

        result2 = StatementParserService.process_csv(sample_csv_data, db_session, account_id=acc.id)
        assert result2["added"] == 0
        assert result2["skipped"] == 3

    def test_process_csv_identical_twins(self, db_session):
        """Test that two identical rows in one file both get saved with unique hashes."""
        acc = _seed_account(db_session)
        csv_data = "Date,Description,Amount\n2024-01-01,Same Store,-50.00\n2024-01-01,Same Store,-50.00\n"

        result = StatementParserService.process_csv(csv_data, db_session, account_id=acc.id)

        assert result["added"] == 2
        expenses = db_session.query(Expense).all()
        assert len(expenses) == 2
        hashes = [e.transaction_hash for e in expenses]
        assert hashes[0] != hashes[1]

    def test_process_csv_income_detection(self, db_session):
        """Test that positive amounts are correctly flagged as income."""
        acc = _seed_account(db_session)
        csv_data = "Date,Description,Amount\n2024-01-01,Salary,3000.00\n"

        StatementParserService.process_csv(csv_data, db_session, account_id=acc.id)

        salary = db_session.query(Expense).filter(Expense.description == "Salary").first()
        assert salary is not None
        assert salary.is_income is True
        assert salary.amount == 3000.00
