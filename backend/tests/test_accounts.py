"""Tests for the bank accounts API endpoints."""
import pytest
from fastapi import status


ACCOUNT_PAYLOAD = {
    "account_name": "My Checking",
    "bank_name": "HSBC",
    "amount_style": "single_column",
    "invert_amounts": False,
    "mappings": {
        "date_column": "Date",
        "description_column": "Description",
        "amount_column": "Amount",
    },
}


class TestAccountsEndpoints:
    """Test suite for the bank accounts API endpoints."""

    def test_create_account_success(self, client):
        """POST creates an account and returns it with an integer ID."""
        response = client.post("/api/v1/accounts/", json=ACCOUNT_PAYLOAD)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["account_name"] == "My Checking"
        assert data["bank_name"] == "HSBC"
        assert isinstance(data["id"], int)

    def test_create_duplicate_account_returns_409(self, client):
        """Creating an account with the same name returns 409."""
        client.post("/api/v1/accounts/", json=ACCOUNT_PAYLOAD)
        response = client.post("/api/v1/accounts/", json=ACCOUNT_PAYLOAD)
        assert response.status_code == status.HTTP_409_CONFLICT
        assert "already exists" in response.json()["detail"].lower()

    def test_list_accounts_returns_active_by_default(self, client):
        """GET / returns only active accounts by default."""
        client.post("/api/v1/accounts/", json=ACCOUNT_PAYLOAD)
        response = client.get("/api/v1/accounts/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) >= 1

    def test_list_accounts_includes_created(self, client):
        """Listed accounts include the one just created."""
        client.post("/api/v1/accounts/", json=ACCOUNT_PAYLOAD)
        response = client.get("/api/v1/accounts/")
        names = [a["account_name"] for a in response.json()]
        assert "My Checking" in names

    def test_get_account_by_id(self, client):
        """GET /{id} returns the account."""
        create_resp = client.post("/api/v1/accounts/", json=ACCOUNT_PAYLOAD)
        account_id = create_resp.json()["id"]
        response = client.get(f"/api/v1/accounts/{account_id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == account_id

    def test_get_account_not_found(self, client):
        """GET /{id} with non-existent ID returns 404."""
        response = client.get("/api/v1/accounts/9999")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_account(self, client):
        """PUT /{id} updates account fields."""
        create_resp = client.post("/api/v1/accounts/", json=ACCOUNT_PAYLOAD)
        account_id = create_resp.json()["id"]
        response = client.put(f"/api/v1/accounts/{account_id}", json={"bank_name": "Barclays"})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["bank_name"] == "Barclays"

    def test_update_account_not_found(self, client):
        """PUT /{id} on non-existent account returns 404."""
        response = client.put("/api/v1/accounts/9999", json={"bank_name": "Ghost"})
        assert response.status_code == status.HTTP_404_NOT_FOUND
