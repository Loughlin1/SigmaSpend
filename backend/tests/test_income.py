"""Tests for the income settings API endpoints."""
import pytest
from fastapi import status


class TestIncomeEndpoints:
    """Test suite for the income settings API endpoints."""

    def test_get_income_creates_default_when_missing(self, client):
        """GET /income/ auto-creates a default row and returns it."""
        response = client.get("/api/v1/income/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "id" in data
        assert data["monthly_net_income"] == 0.0

    def test_get_income_returns_existing(self, client):
        """GET /income/ returns the same record on repeated calls."""
        first = client.get("/api/v1/income/").json()
        second = client.get("/api/v1/income/").json()
        assert first["id"] == second["id"]

    def test_update_income_success(self, client):
        """PUT /income/ updates the monthly net income value."""
        response = client.put("/api/v1/income/", json={"monthly_net_income": 3500.00})
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["monthly_net_income"] == 3500.0

    def test_update_income_persists(self, client):
        """Updated income value is reflected in subsequent GET."""
        client.put("/api/v1/income/", json={"monthly_net_income": 4200.50})
        response = client.get("/api/v1/income/")
        assert response.json()["monthly_net_income"] == 4200.5

    def test_update_income_zero(self, client):
        """Setting income to 0 is a valid update."""
        client.put("/api/v1/income/", json={"monthly_net_income": 5000.0})
        response = client.put("/api/v1/income/", json={"monthly_net_income": 0.0})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["monthly_net_income"] == 0.0

    def test_update_income_invalid_payload(self, client):
        """PUT /income/ with a non-numeric value returns 422."""
        response = client.put("/api/v1/income/", json={"monthly_net_income": "not-a-number"})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_income_response_has_updated_at(self, client):
        """Response includes the updated_at timestamp field."""
        client.put("/api/v1/income/", json={"monthly_net_income": 2000.0})
        data = client.get("/api/v1/income/").json()
        # updated_at may be null if the DB hasn't set it yet, but the field must be present
        assert "updated_at" in data
