import pytest
from fastapi import status


class TestBankAccountEndpoints:
    """Test suite for bank account management endpoints."""
    
    def test_create_bank_account(self, client):
        """Test creating a new bank account."""
        account_data = {
            "account_id": "new_account_001",
            "account_name": "New Checking Account",
            "bank_name": "Chase Bank",
            "amount_style": "single_column",
            "mappings": {
                "date_column": "Date",
                "description_column": "Description",
                "amount_column": "Amount",
            }
        }
        
        response = client.post("/api/v1/accounts", json=account_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["account_id"] == account_data["account_id"]
        assert data["account_name"] == account_data["account_name"]
        assert data["is_active"] is True
    
    def test_create_duplicate_account(self, client, test_bank_account):
        """Test creating a duplicate account returns conflict."""
        account_data = {
            "account_id": test_bank_account["account_id"],
            "account_name": "Another Name",
            "bank_name": "Different Bank",
            "amount_style": "single_column",
            "mappings": {
                "date_column": "Date",
                "description_column": "Description",
                "amount_column": "Amount",
            }
        }
        
        response = client.post("/api/v1/accounts", json=account_data)
        
        assert response.status_code == status.HTTP_409_CONFLICT
    
    def test_list_bank_accounts(self, client, test_bank_account):
        """Test listing bank accounts."""
        response = client.get("/api/v1/accounts")
        
        assert response.status_code == status.HTTP_200_OK
        accounts = response.json()
        assert len(accounts) >= 1
        assert any(acc["account_id"] == test_bank_account["account_id"] for acc in accounts)
    
    def test_get_bank_account(self, client, test_bank_account):
        """Test retrieving a specific bank account."""
        response = client.get(f"/api/v1/accounts/{test_bank_account['account_id']}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["account_id"] == test_bank_account["account_id"]
        assert data["account_name"] == test_bank_account["account_name"]
    
    def test_get_nonexistent_account(self, client):
        """Test retrieving a non-existent account."""
        response = client.get("/api/v1/accounts/nonexistent")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_update_bank_account(self, client, test_bank_account):
        """Test updating a bank account."""
        update_data = {
            "account_name": "Updated Account Name",
            "is_active": False
        }
        
        response = client.put(
            f"/api/v1/accounts/{test_bank_account['account_id']}",
            json=update_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["account_name"] == "Updated Account Name"
        assert data["is_active"] is False
    
    def test_list_accounts_active_only(self, client, test_bank_account):
        """Test listing only active accounts."""
        client.put(
            f"/api/v1/accounts/{test_bank_account['account_id']}",
            json={"is_active": False}
        )
        
        response = client.get("/api/v1/accounts?active_only=true")
        
        assert response.status_code == status.HTTP_200_OK
        accounts = response.json()
        assert not any(acc["account_id"] == test_bank_account["account_id"] for acc in accounts)
        
        response = client.get("/api/v1/accounts?active_only=false")
        
        assert response.status_code == status.HTTP_200_OK
        accounts = response.json()
        assert any(acc["account_id"] == test_bank_account["account_id"] for acc in accounts)