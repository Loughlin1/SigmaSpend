import pytest
from fastapi import status


VALID_ACCOUNT = {
    "account_name": "New Checking Account",
    "bank_name": "Chase Bank",
    "amount_style": "single_column",
    "invert_amounts": False,
    "mappings": {
        "date_column": "Date",
        "description_column": "Description",
        "amount_column": "Amount",
    },
}


class TestBankAccountEndpoints:
    """Test suite for bank account management endpoints."""

    def test_create_bank_account(self, client):
        """Test creating a new bank account."""
        response = client.post("/api/v1/accounts/", json=VALID_ACCOUNT)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["account_name"] == VALID_ACCOUNT["account_name"]
        assert data["bank_name"] == VALID_ACCOUNT["bank_name"]
        assert data["is_active"] is True
        assert "id" in data

    def test_create_duplicate_account(self, client, test_bank_account):
        """Test creating a duplicate account name returns conflict."""
        duplicate = VALID_ACCOUNT.copy()
        duplicate["account_name"] = test_bank_account["account_name"]

        response = client.post("/api/v1/accounts/", json=duplicate)
        assert response.status_code == status.HTTP_409_CONFLICT

    def test_list_bank_accounts(self, client, test_bank_account):
        """Test listing bank accounts."""
        response = client.get("/api/v1/accounts/")

        assert response.status_code == status.HTTP_200_OK
        accounts = response.json()
        assert len(accounts) >= 1
        assert any(acc["id"] == test_bank_account["id"] for acc in accounts)

    def test_get_bank_account(self, client, test_bank_account):
        """Test retrieving a specific bank account by integer id."""
        response = client.get(f"/api/v1/accounts/{test_bank_account['id']}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_bank_account["id"]
        assert data["account_name"] == test_bank_account["account_name"]

    def test_get_nonexistent_account(self, client):
        """Test retrieving a non-existent account returns 404."""
        response = client.get("/api/v1/accounts/99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_bank_account(self, client, test_bank_account):
        """Test updating a bank account."""
        update_data = {
            "account_id": test_bank_account["id"],
            "account_name": "Updated Account Name",
            "is_active": False,
        }

        response = client.put(f"/api/v1/accounts/{test_bank_account['id']}", json=update_data)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["account_name"] == "Updated Account Name"
        assert data["is_active"] is False

    def test_list_accounts_active_only(self, client, test_bank_account):
        """Test that active_only filter excludes deactivated accounts."""
        client.put(
            f"/api/v1/accounts/{test_bank_account['id']}",
            json={"account_id": test_bank_account["id"], "is_active": False},
        )

        response = client.get("/api/v1/accounts/?active_only=true")
        assert response.status_code == status.HTTP_200_OK
        assert not any(acc["id"] == test_bank_account["id"] for acc in response.json())

        response = client.get("/api/v1/accounts/?active_only=false")
        assert response.status_code == status.HTTP_200_OK
        assert any(acc["id"] == test_bank_account["id"] for acc in response.json())

    def test_create_account_missing_required_field(self, client):
        """Test that missing required fields return 422."""
        incomplete = {"account_name": "Missing Fields"}
        response = client.post("/api/v1/accounts/", json=incomplete)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
