"""Tests for the budgets API endpoints."""
import pytest
from fastapi import status


class TestBudgetsEndpoints:
    """Test suite for the budgets API endpoints."""

    def test_list_budgets_empty(self, client):
        """Returns an empty list when no budgets exist."""
        response = client.get("/api/v1/budgets/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_upsert_creates_budget(self, client, test_category):
        """PUT a valid category_id creates a budget."""
        response = client.put(
            f"/api/v1/budgets/{test_category.id}",
            json={"amount": "200.00", "period": "monthly"},
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["category_id"] == test_category.id
        assert data["amount"] == 200.0
        assert data["period"] == "monthly"
        assert "id" in data

    def test_upsert_updates_existing_budget(self, client, test_category):
        """PUT again on the same category_id updates amount and period."""
        client.put(f"/api/v1/budgets/{test_category.id}", json={"amount": "100.00", "period": "monthly"})
        response = client.put(f"/api/v1/budgets/{test_category.id}", json={"amount": "350.00", "period": "yearly"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["amount"] == 350.0
        assert data["period"] == "yearly"

    def test_upsert_invalid_category_returns_404(self, client):
        """PUT with a category that doesn't exist returns 404."""
        response = client.put("/api/v1/budgets/9999", json={"amount": "100.00", "period": "monthly"})
        assert response.status_code == status.HTTP_404_NOT_FOUND
        detail = response.json()["detail"].lower()
        assert "category" in detail and "not found" in detail

    def test_upsert_invalid_period_returns_422(self, client, test_category):
        """PUT with an unknown period value returns 422."""
        response = client.put(
            f"/api/v1/budgets/{test_category.id}",
            json={"amount": "100.00", "period": "weekly"},
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_list_budgets_includes_created(self, client, test_category):
        """Listed budgets include the one that was upserted."""
        client.put(f"/api/v1/budgets/{test_category.id}", json={"amount": "150.00", "period": "monthly"})
        response = client.get("/api/v1/budgets/")
        category_ids = [b["category_id"] for b in response.json()]
        assert test_category.id in category_ids

    def test_delete_budget(self, client, test_category):
        """DELETE removes the budget and subsequent GET excludes it."""
        client.put(f"/api/v1/budgets/{test_category.id}", json={"amount": "100.00", "period": "monthly"})
        response = client.delete(f"/api/v1/budgets/{test_category.id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        list_resp = client.get("/api/v1/budgets/")
        category_ids = [b["category_id"] for b in list_resp.json()]
        assert test_category.id not in category_ids

    def test_delete_nonexistent_budget_returns_404(self, client, test_category):
        """Deleting a budget that doesn't exist returns 404."""
        response = client.delete(f"/api/v1/budgets/{test_category.id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "no budget found" in response.json()["detail"].lower()
