"""Tests for the expenses API endpoints."""
import datetime
import pytest
from fastapi import status

from app.models.expense import Expense as ExpenseModel
from app.models.category import Category as CategoryModel


class TestExpensesEndpoints:
    """Test suite for the expenses API endpoints."""

    @pytest.fixture
    def expense(self, db_session, test_bank_account) -> ExpenseModel:
        e = ExpenseModel(
            amount=42.50,
            is_income=False,
            description="Coffee shop",
            date=datetime.date(2024, 3, 15),
            account_id=test_bank_account["id"],
            transaction_hash="exp_test_hash_001",
        )
        db_session.add(e)
        db_session.flush()
        return e

    def test_list_expenses_empty(self, client):
        """Returns paginated empty list when no expenses exist."""
        response = client.get("/api/v1/expenses/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items"] == []
        assert data["total_count"] == 0

    def test_create_expense_success(self, client, sample_expense_data):
        """POST creates a manual expense and returns it."""
        response = client.post("/api/v1/expenses/", json=sample_expense_data)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["amount"] == sample_expense_data["amount"]
        assert data["description"] == sample_expense_data["description"]
        assert "id" in data
        assert "transaction_hash" in data

    def test_get_expense_by_id(self, client, expense):
        """GET /{id} returns the expense."""
        response = client.get(f"/api/v1/expenses/{expense.id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == expense.id

    def test_get_expense_not_found(self, client):
        """GET /{id} with non-existent ID returns 404."""
        response = client.get("/api/v1/expenses/9999")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def _update_payload(self, expense, **overrides) -> dict:
        payload = {
            "account_id": expense.account_id,
            "date": expense.date.strftime("%Y-%m-%d"),
            "amount": float(expense.amount),
            "is_income": expense.is_income,
            "description": expense.description,
        }
        payload.update(overrides)
        return payload

    def test_update_expense(self, client, expense):
        """PUT /{id} updates fields on the expense."""
        payload = self._update_payload(expense, description="Updated desc")
        response = client.put(f"/api/v1/expenses/{expense.id}", json=payload)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["description"] == "Updated desc"

    def test_update_expense_not_found(self, client, test_bank_account):
        """PUT /{id} on non-existent expense returns 404."""
        payload = {
            "account_id": test_bank_account["id"],
            "date": "2024-01-01",
            "amount": 10.0,
            "is_income": False,
            "description": "Ghost",
        }
        response = client.put("/api/v1/expenses/9999", json=payload)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_expense(self, client, expense):
        """DELETE /{id} removes the expense."""
        response = client.delete(f"/api/v1/expenses/{expense.id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert client.get(f"/api/v1/expenses/{expense.id}").status_code == status.HTTP_404_NOT_FOUND

    def test_delete_expense_not_found(self, client):
        """DELETE /{id} on non-existent expense returns 404."""
        response = client.delete("/api/v1/expenses/9999")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_filter_by_is_income(self, client, db_session, test_bank_account):
        """is_income filter separates income from expenses."""
        db_session.add(ExpenseModel(
            amount=100.0, is_income=True, description="Salary",
            date=datetime.date(2024, 1, 1), account_id=test_bank_account["id"],
            transaction_hash="income_hash_filter_01",
        ))
        db_session.add(ExpenseModel(
            amount=20.0, is_income=False, description="Bus",
            date=datetime.date(2024, 1, 2), account_id=test_bank_account["id"],
            transaction_hash="expense_hash_filter_01",
        ))
        db_session.flush()

        income_resp = client.get("/api/v1/expenses/?is_income=true")
        assert all(e["is_income"] for e in income_resp.json()["items"])

        expense_resp = client.get("/api/v1/expenses/?is_income=false")
        assert all(not e["is_income"] for e in expense_resp.json()["items"])

    def test_bulk_classify(self, client, db_session, test_bank_account):
        """bulk-classify assigns a category to multiple expenses."""
        cat = CategoryModel(name="Transport")
        db_session.add(cat)
        e1 = ExpenseModel(
            amount=5.0, is_income=False, description="Bus", date=datetime.date(2024, 1, 1),
            account_id=test_bank_account["id"], transaction_hash="bulk_class_01",
        )
        e2 = ExpenseModel(
            amount=10.0, is_income=False, description="Tube", date=datetime.date(2024, 1, 2),
            account_id=test_bank_account["id"], transaction_hash="bulk_class_02",
        )
        db_session.add_all([e1, e2])
        db_session.flush()

        response = client.post(
            "/api/v1/expenses/bulk-classify",
            json={"expense_ids": [e1.id, e2.id], "category_id": cat.id},
        )
        assert response.status_code == status.HTTP_200_OK
        db_session.expire_all()
        assert e1.category_id == cat.id
        assert e2.category_id == cat.id

    def test_bulk_delete(self, client, db_session, test_bank_account):
        """bulk-delete removes multiple expenses."""
        e = ExpenseModel(
            amount=15.0, is_income=False, description="Delete me",
            date=datetime.date(2024, 1, 1), account_id=test_bank_account["id"],
            transaction_hash="bulk_del_01",
        )
        db_session.add(e)
        db_session.flush()

        response = client.post("/api/v1/expenses/bulk-delete", json={"expense_ids": [e.id]})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["deleted"] == 1

    def test_bulk_update_type(self, client, db_session, test_bank_account):
        """bulk-update-type flips is_income on multiple expenses."""
        e = ExpenseModel(
            amount=50.0, is_income=False, description="Refund",
            date=datetime.date(2024, 1, 1), account_id=test_bank_account["id"],
            transaction_hash="bulk_type_01",
        )
        db_session.add(e)
        db_session.flush()

        response = client.post(
            "/api/v1/expenses/bulk-update-type",
            json={"expense_ids": [e.id], "is_income": True},
        )
        assert response.status_code == status.HTTP_200_OK
        db_session.expire(e)
        assert e.is_income is True

    def test_bulk_assign_holiday(self, client, db_session, test_bank_account):
        """bulk-assign-holiday links expenses to a holiday."""
        from app.models.holiday import Holiday as HolidayModel
        holiday = HolidayModel(name="Test Trip")
        db_session.add(holiday)
        e = ExpenseModel(
            amount=80.0, is_income=False, description="Hotel",
            date=datetime.date(2024, 8, 1), account_id=test_bank_account["id"],
            transaction_hash="bulk_hol_01",
        )
        db_session.add(e)
        db_session.flush()

        response = client.post(
            "/api/v1/expenses/bulk-assign-holiday",
            json={"expense_ids": [e.id], "holiday_id": holiday.id},
        )
        assert response.status_code == status.HTTP_200_OK
        db_session.expire(e)
        assert e.holiday_id == holiday.id

    def test_get_distinct_years(self, client, db_session, test_bank_account):
        """analytics/years returns distinct years from expenses."""
        db_session.add(ExpenseModel(
            amount=10.0, is_income=False, description="A",
            date=datetime.date(2023, 6, 1), account_id=test_bank_account["id"],
            transaction_hash="year_2023_01",
        ))
        db_session.add(ExpenseModel(
            amount=20.0, is_income=False, description="B",
            date=datetime.date(2024, 1, 1), account_id=test_bank_account["id"],
            transaction_hash="year_2024_01",
        ))
        db_session.flush()

        response = client.get("/api/v1/expenses/analytics/years")
        assert response.status_code == status.HTTP_200_OK
        years = response.json()
        assert 2023 in years
        assert 2024 in years
