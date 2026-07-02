"""Tests for the holidays API endpoints."""
import datetime
import pytest
from fastapi import status

from app.models.holiday import Holiday as HolidayModel
from app.models.expense import Expense as ExpenseModel


class TestHolidaysEndpoints:
    """Test suite for the holidays API endpoints."""

    def test_list_holidays_empty(self, client):
        """Returns an empty list when no holidays exist."""
        response = client.get("/api/v1/holidays/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_create_holiday_success(self, client):
        """Creates a holiday and returns it with computed fields zeroed."""
        payload = {
            "name": "Summer Trip",
            "destination": "Italy",
            "start_date": "2024-07-01",
            "end_date": "2024-07-14",
            "notes": "First proper holiday",
            "flag": "🇮🇹",
        }
        response = client.post("/api/v1/holidays/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Summer Trip"
        assert data["destination"] == "Italy"
        assert data["flag"] == "🇮🇹"
        assert data["expense_count"] == 0
        assert data["total_spend"] == 0.0
        assert "id" in data

    def test_create_holiday_minimal(self, client):
        """Creates a holiday with only required fields."""
        response = client.post("/api/v1/holidays/", json={"name": "Minimal Trip"})
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Minimal Trip"
        assert data["destination"] is None
        assert data["flag"] is None

    def test_list_holidays_returns_created(self, client):
        """Listed holidays include the one just created."""
        client.post("/api/v1/holidays/", json={"name": "Paris"})
        response = client.get("/api/v1/holidays/")
        assert response.status_code == status.HTTP_200_OK
        names = [h["name"] for h in response.json()]
        assert "Paris" in names

    def test_list_holidays_computes_expense_count(self, client, db_session, test_bank_account):
        """expense_count and total_spend are computed from linked expenses."""
        holiday_resp = client.post("/api/v1/holidays/", json={"name": "Linked"})
        holiday_id = holiday_resp.json()["id"]

        expense = ExpenseModel(
            amount=50.0,
            is_income=False,
            description="Hotel",
            date=datetime.date(2024, 8, 1),
            account_id=test_bank_account["id"],
            holiday_id=holiday_id,
            transaction_hash="abc123holiday1",
        )
        db_session.add(expense)
        db_session.flush()

        response = client.get("/api/v1/holidays/")
        holidays = response.json()
        linked = next(h for h in holidays if h["id"] == holiday_id)
        assert linked["expense_count"] == 1
        assert linked["total_spend"] == 50.0

    def test_list_holidays_nets_income_against_expenses(self, client, db_session, test_bank_account):
        """Income (e.g. a reimbursement) linked to a holiday offsets total_spend but doesn't count as an expense."""
        holiday_resp = client.post("/api/v1/holidays/", json={"name": "Reimbursed trip"})
        holiday_id = holiday_resp.json()["id"]

        expense = ExpenseModel(
            amount=500.0,
            is_income=False,
            description="Hotel",
            date=datetime.date(2024, 8, 1),
            account_id=test_bank_account["id"],
            holiday_id=holiday_id,
            transaction_hash="abc123holiday2",
        )
        refund = ExpenseModel(
            amount=200.0,
            is_income=True,
            description="Refund",
            date=datetime.date(2024, 8, 2),
            account_id=test_bank_account["id"],
            holiday_id=holiday_id,
            transaction_hash="abc123income1",
        )
        db_session.add_all([expense, refund])
        db_session.flush()

        response = client.get("/api/v1/holidays/")
        linked = next(h for h in response.json() if h["id"] == holiday_id)
        assert linked["expense_count"] == 1
        assert linked["total_spend"] == 300.0

    def test_update_holiday_success(self, client):
        """Updating an existing holiday returns updated fields."""
        create_resp = client.post("/api/v1/holidays/", json={"name": "Old Name"})
        holiday_id = create_resp.json()["id"]

        response = client.put(
            f"/api/v1/holidays/{holiday_id}",
            json={"name": "New Name", "destination": "Spain"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "New Name"
        assert data["destination"] == "Spain"

    def test_update_holiday_not_found(self, client):
        """Updating a non-existent holiday returns 404."""
        response = client.put("/api/v1/holidays/9999", json={"name": "Ghost"})
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()

    def test_delete_holiday_success(self, client):
        """Deleting a holiday returns 204 and removes it from the list."""
        create_resp = client.post("/api/v1/holidays/", json={"name": "Deletable"})
        holiday_id = create_resp.json()["id"]

        response = client.delete(f"/api/v1/holidays/{holiday_id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        list_resp = client.get("/api/v1/holidays/")
        ids = [h["id"] for h in list_resp.json()]
        assert holiday_id not in ids

    def test_delete_holiday_unlinks_expenses(self, client, db_session, test_bank_account):
        """Deleting a holiday sets holiday_id=None on linked expenses."""
        holiday_resp = client.post("/api/v1/holidays/", json={"name": "Trip to Delete"})
        holiday_id = holiday_resp.json()["id"]

        expense = ExpenseModel(
            amount=25.0,
            is_income=False,
            description="Snack",
            date=datetime.date(2024, 8, 1),
            account_id=test_bank_account["id"],
            holiday_id=holiday_id,
            transaction_hash="abc123snack1",
        )
        db_session.add(expense)
        db_session.flush()

        response = client.delete(f"/api/v1/holidays/{holiday_id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        db_session.expire(expense)
        assert expense.holiday_id is None

    def test_delete_holiday_not_found(self, client):
        """Deleting a non-existent holiday returns 404."""
        response = client.delete("/api/v1/holidays/9999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
