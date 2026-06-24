"""
Tests for the ExpenseAnalyticsService — multi-tier aggregation queries.
"""
import datetime
import logging
import pytest

from app.models.bank_account import BankAccount
from app.models.category import Category
from app.models.expense import Expense
from app.services.analytics import ExpenseAnalyticsService

logger = logging.getLogger("sigmaspend_test")


def _seed_account(db) -> BankAccount:
    acc = BankAccount(
        account_name="Analytics Test Account",
        bank_name="Test Bank",
        amount_style="single_column",
        invert_amounts=False,
        mappings={},
    )
    db.add(acc)
    db.commit()
    return acc


def _seed_expense(db, acc, amount, is_income, date, category_id=None, description="Tx"):
    e = Expense(
        account_id=acc.id,
        description=description,
        amount=amount,
        is_income=is_income,
        date=date,
        transaction_hash=f"hash-{description}-{amount}-{date}",
        category_id=category_id,
    )
    db.add(e)
    db.commit()
    return e


class TestExpenseAnalyticsService:

    def test_returns_list_of_dicts(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, 50.0, False, datetime.date(2024, 1, 15))

        result = ExpenseAnalyticsService.get_multi_tier_summary(db_session, logger)
        assert isinstance(result, list)
        for row in result:
            assert isinstance(row, dict)

    def test_empty_db_returns_empty_list(self, db_session):
        result = ExpenseAnalyticsService.get_multi_tier_summary(db_session, logger)
        assert result == []

    def test_result_rows_have_expected_keys(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, 50.0, False, datetime.date(2024, 1, 15))

        result = ExpenseAnalyticsService.get_multi_tier_summary(db_session, logger)
        assert len(result) > 0
        row = result[0]
        assert "period" in row
        assert "type" in row
        assert "total_income" in row
        assert "total_expenses" in row

    def test_groups_by_month_by_default(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, 10.0, False, datetime.date(2024, 1, 5))
        _seed_expense(db_session, acc, 20.0, False, datetime.date(2024, 1, 20))
        _seed_expense(db_session, acc, 30.0, False, datetime.date(2024, 2, 10))

        result = ExpenseAnalyticsService.get_multi_tier_summary(db_session, logger)
        periods = {r["period"] for r in result}
        assert "2024-01" in periods
        assert "2024-02" in periods

    def test_groups_by_year(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, 100.0, False, datetime.date(2023, 6, 1))
        _seed_expense(db_session, acc, 200.0, False, datetime.date(2024, 6, 1))

        result = ExpenseAnalyticsService.get_multi_tier_summary(
            db_session, logger, group_by="year"
        )
        periods = {r["period"] for r in result}
        assert "2023" in periods
        assert "2024" in periods

    def test_groups_by_day(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, 5.0, False, datetime.date(2024, 3, 14))

        result = ExpenseAnalyticsService.get_multi_tier_summary(
            db_session, logger, group_by="day"
        )
        periods = {r["period"] for r in result}
        assert "2024-03-14" in periods

    def test_income_and_expense_totals_are_separate(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, 1000.0, True, datetime.date(2024, 1, 1), description="Salary")
        _seed_expense(db_session, acc, 50.0, False, datetime.date(2024, 1, 2), description="Coffee")

        result = ExpenseAnalyticsService.get_multi_tier_summary(db_session, logger)
        totals = [r for r in result if r["type"] == "total"]
        assert len(totals) >= 1
        jan = next(r for r in totals if r["period"] == "2024-01")
        assert jan["total_income"] == 1000.0
        assert jan["total_expenses"] == 50.0

    def test_filter_by_account_id(self, db_session):
        acc1 = _seed_account(db_session)
        acc2 = BankAccount(
            account_name="Second Analytics Account", bank_name="Other Bank",
            amount_style="single_column", invert_amounts=False, mappings={},
        )
        db_session.add(acc2)
        db_session.commit()

        _seed_expense(db_session, acc1, 100.0, False, datetime.date(2024, 1, 1))
        _seed_expense(db_session, acc2, 200.0, False, datetime.date(2024, 1, 1))

        result = ExpenseAnalyticsService.get_multi_tier_summary(
            db_session, logger, account_id=acc1.id
        )
        totals = [r for r in result if r["type"] == "total"]
        assert len(totals) >= 1
        assert totals[0]["total_expenses"] == 100.0

    def test_filter_by_date_range(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, 10.0, False, datetime.date(2024, 1, 1))
        _seed_expense(db_session, acc, 20.0, False, datetime.date(2024, 6, 1))
        _seed_expense(db_session, acc, 30.0, False, datetime.date(2024, 12, 1))

        result = ExpenseAnalyticsService.get_multi_tier_summary(
            db_session, logger, start_date="2024-03-01", end_date="2024-09-30"
        )
        periods = {r["period"] for r in result}
        assert "2024-06" in periods
        assert "2024-01" not in periods
        assert "2024-12" not in periods

    def test_result_includes_category_rows(self, db_session):
        acc = _seed_account(db_session)
        cat = Category(name="Groceries", icon="🛒")
        db_session.add(cat)
        db_session.commit()

        _seed_expense(db_session, acc, 80.0, False, datetime.date(2024, 1, 10), category_id=cat.id)

        result = ExpenseAnalyticsService.get_multi_tier_summary(db_session, logger)
        types = {r["type"] for r in result}
        assert "category" in types

    def test_invalid_start_date_is_ignored_gracefully(self, db_session):
        """Invalid date strings should be logged and skipped without crashing."""
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, 10.0, False, datetime.date(2024, 1, 1))

        # Should not raise
        result = ExpenseAnalyticsService.get_multi_tier_summary(
            db_session, logger, start_date="not-a-date"
        )
        assert isinstance(result, list)
