"""
Tests for the ExpenseService — filtering, pagination, and manual creation.
"""
import datetime
import pytest

from app.models.bank_account import BankAccount
from app.models.category import Category
from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate
from app.services.expense import ExpenseService


def _seed_account(db) -> BankAccount:
    acc = BankAccount(
        account_name="Service Test Account",
        bank_name="Test Bank",
        amount_style="single_column",
        invert_amounts=False,
        mappings={"date_column": "Date", "description_column": "Description", "amount_column": "Amount"},
    )
    db.add(acc)
    db.commit()
    return acc


def _seed_expense(db, acc, description="Test", amount=50.0, is_income=False,
                  date=None, category_id=None) -> Expense:
    e = Expense(
        account_id=acc.id,
        description=description,
        amount=amount,
        is_income=is_income,
        date=date or datetime.date(2024, 1, 15),
        transaction_hash=f"hash-{description}-{amount}",
        category_id=category_id,
    )
    db.add(e)
    db.commit()
    return e


class TestGetFilteredExpensesWithCount:

    def test_returns_all_when_no_filters(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, "Coffee", 5.0)
        _seed_expense(db_session, acc, "Salary", 3000.0, is_income=True)

        items, total = ExpenseService.get_filtered_expenses_with_count(db_session)
        assert total == 2
        assert len(items) == 2

    def test_filter_by_account_id(self, db_session):
        acc1 = _seed_account(db_session)
        acc2 = BankAccount(
            account_name="Second Account", bank_name="Bank B",
            amount_style="single_column", invert_amounts=False,
            mappings={},
        )
        db_session.add(acc2)
        db_session.commit()

        _seed_expense(db_session, acc1, "Acc1 Item", 10.0)
        _seed_expense(db_session, acc2, "Acc2 Item", 20.0)

        items, total = ExpenseService.get_filtered_expenses_with_count(db_session, account_id=acc1.id)
        assert total == 1
        assert items[0].description == "Acc1 Item"

    def test_filter_income_only(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, "Coffee", 5.0, is_income=False)
        _seed_expense(db_session, acc, "Salary", 3000.0, is_income=True)

        items, total = ExpenseService.get_filtered_expenses_with_count(db_session, is_income=True)
        assert total == 1
        assert items[0].description == "Salary"

    def test_filter_expense_only(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, "Coffee", 5.0, is_income=False)
        _seed_expense(db_session, acc, "Salary", 3000.0, is_income=True)

        items, total = ExpenseService.get_filtered_expenses_with_count(db_session, is_income=False)
        assert total == 1
        assert items[0].description == "Coffee"

    def test_filter_by_start_date(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, "Early", 10.0, date=datetime.date(2024, 1, 1))
        _seed_expense(db_session, acc, "Late", 20.0, date=datetime.date(2024, 6, 1))

        items, total = ExpenseService.get_filtered_expenses_with_count(
            db_session, start_date="2024-03-01"
        )
        assert total == 1
        assert items[0].description == "Late"

    def test_filter_by_end_date(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, "Early", 10.0, date=datetime.date(2024, 1, 1))
        _seed_expense(db_session, acc, "Late", 20.0, date=datetime.date(2024, 6, 1))

        items, total = ExpenseService.get_filtered_expenses_with_count(
            db_session, end_date="2024-02-28"
        )
        assert total == 1
        assert items[0].description == "Early"

    def test_search_query_matches_description(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, "Starbucks Coffee", 5.0)
        _seed_expense(db_session, acc, "Netflix Subscription", 15.0)

        items, total = ExpenseService.get_filtered_expenses_with_count(db_session, q="starbucks")
        assert total == 1
        assert items[0].description == "Starbucks Coffee"

    def test_search_is_case_insensitive(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, "TESCO SUPERSTORE", 80.0)

        items, total = ExpenseService.get_filtered_expenses_with_count(db_session, q="tesco")
        assert total == 1

    def test_pagination_skip_and_limit(self, db_session):
        acc = _seed_account(db_session)
        for i in range(5):
            _seed_expense(db_session, acc, f"Item {i}", 10.0 + i,
                          date=datetime.date(2024, 1, i + 1))

        items, total = ExpenseService.get_filtered_expenses_with_count(
            db_session, skip=0, limit=2
        )
        assert total == 5       # full count is unaffected by pagination
        assert len(items) == 2

    def test_results_are_ordered_by_date_descending(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, "Oldest", 10.0, date=datetime.date(2024, 1, 1))
        _seed_expense(db_session, acc, "Newest", 20.0, date=datetime.date(2024, 12, 31))

        items, _ = ExpenseService.get_filtered_expenses_with_count(db_session)
        assert items[0].description == "Newest"
        assert items[-1].description == "Oldest"

    def test_filter_by_category_name(self, db_session):
        acc = _seed_account(db_session)
        cat = Category(name="Groceries", icon="🛒")
        db_session.add(cat)
        db_session.commit()

        _seed_expense(db_session, acc, "Tesco", 50.0, category_id=cat.id)
        _seed_expense(db_session, acc, "Netflix", 15.0)  # no category

        items, total = ExpenseService.get_filtered_expenses_with_count(
            db_session, category="Groceries"
        )
        assert total == 1
        assert items[0].description == "Tesco"

    def test_filter_uncategorized(self, db_session):
        acc = _seed_account(db_session)
        cat = Category(name="Transport", icon="🚗")
        db_session.add(cat)
        db_session.commit()

        _seed_expense(db_session, acc, "TFL", 5.0, category_id=cat.id)
        _seed_expense(db_session, acc, "Unknown Vendor", 10.0)  # no category

        items, total = ExpenseService.get_filtered_expenses_with_count(
            db_session, category="uncategorized"
        )
        assert total == 1
        assert items[0].description == "Unknown Vendor"

    def test_filter_by_nonexistent_category_returns_empty(self, db_session):
        acc = _seed_account(db_session)
        _seed_expense(db_session, acc, "Coffee", 5.0)

        items, total = ExpenseService.get_filtered_expenses_with_count(
            db_session, category="Phantom Category"
        )
        assert total == 0
        assert items == []


class TestCreateManualExpense:

    def test_creates_expense_with_correct_fields(self, db_session):
        acc = _seed_account(db_session)
        payload = ExpenseCreate(
            account_id=acc.id,
            description="Manual Purchase",
            amount=99.99,
            is_income=False,
            date="2024-03-10",
        )

        result = ExpenseService.create_manual_expense(db_session, payload)

        assert result.id is not None
        assert result.description == "Manual Purchase"
        assert result.amount == 99.99
        assert result.is_income is False
        assert result.date == datetime.date(2024, 3, 10)
        assert result.transaction_hash is not None

    def test_creates_unique_hash(self, db_session):
        acc = _seed_account(db_session)
        p1 = ExpenseCreate(account_id=acc.id, description="A", amount=10.0, is_income=False, date="2024-01-01")
        p2 = ExpenseCreate(account_id=acc.id, description="B", amount=20.0, is_income=False, date="2024-01-01")

        r1 = ExpenseService.create_manual_expense(db_session, p1)
        r2 = ExpenseService.create_manual_expense(db_session, p2)

        assert r1.transaction_hash != r2.transaction_hash

    def test_persists_to_database(self, db_session):
        acc = _seed_account(db_session)
        payload = ExpenseCreate(
            account_id=acc.id, description="DB Persist Check",
            amount=1.0, is_income=False, date="2024-01-01",
        )
        result = ExpenseService.create_manual_expense(db_session, payload)

        fetched = db_session.query(Expense).filter(Expense.id == result.id).first()
        assert fetched is not None
        assert fetched.description == "DB Persist Check"
