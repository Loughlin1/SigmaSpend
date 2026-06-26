"""Tests for the bucket budgets API endpoints."""
import pytest
from fastapi import status


class TestBucketBudgetsEndpoints:
    """Test suite for the bucket budgets API endpoints."""

    def test_list_bucket_budgets_empty(self, client):
        """Returns an empty list when no budgets exist."""
        response = client.get("/api/v1/bucket-budgets/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_upsert_creates_budget(self, client):
        """PUT a valid bucket key creates the budget entry."""
        response = client.put("/api/v1/bucket-budgets/50_needs", json={"amount": "1500.00"})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["bucket_key"] == "50_needs"
        assert data["amount"] == 1500.0

    def test_upsert_updates_existing_budget(self, client):
        """PUT on an existing bucket key updates the amount."""
        client.put("/api/v1/bucket-budgets/30_wants", json={"amount": "800.00"})
        response = client.put("/api/v1/bucket-budgets/30_wants", json={"amount": "900.00"})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["amount"] == 900.0

    def test_upsert_all_valid_keys(self, client):
        """All three valid bucket keys can be created without error."""
        for key in ("50_needs", "30_wants", "20_savings"):
            r = client.put(f"/api/v1/bucket-budgets/{key}", json={"amount": "100.00"})
            assert r.status_code == status.HTTP_200_OK

    def test_upsert_invalid_key_returns_400(self, client):
        """An unknown bucket key returns 400 Bad Request."""
        response = client.put("/api/v1/bucket-budgets/99_invalid", json={"amount": "500.00"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "invalid bucket key" in response.json()["detail"].lower()

    def test_list_includes_created_budget(self, client):
        """Listed budgets reflect the one that was upserted."""
        client.put("/api/v1/bucket-budgets/20_savings", json={"amount": "600.00"})
        response = client.get("/api/v1/bucket-budgets/")
        keys = [b["bucket_key"] for b in response.json()]
        assert "20_savings" in keys

    def test_delete_bucket_budget(self, client):
        """DELETE removes the budget entry and subsequent GET excludes it."""
        client.put("/api/v1/bucket-budgets/50_needs", json={"amount": "1200.00"})
        response = client.delete("/api/v1/bucket-budgets/50_needs")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        list_resp = client.get("/api/v1/bucket-budgets/")
        keys = [b["bucket_key"] for b in list_resp.json()]
        assert "50_needs" not in keys

    def test_delete_nonexistent_returns_404(self, client):
        """Deleting a budget that doesn't exist returns 404."""
        response = client.delete("/api/v1/bucket-budgets/50_needs")
        assert response.status_code == status.HTTP_404_NOT_FOUND
