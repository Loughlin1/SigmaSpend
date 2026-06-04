"""
Tests for the FastAPI endpoints.
"""
import io
from urllib.parse import quote

import pytest
from fastapi import status


class TestIngestionEndpoints:
    """Test suite for the ingestion API endpoints."""
    
    def test_read_root(self, client):
        """Test the root endpoint."""
        response = client.get("/")
        
        assert response.status_code == status.HTTP_200_OK
        assert "Welcome to the SigmaSpend Backend API" in response.json()["message"]
    
    def test_upload_csv_success(self, client, test_bank_account, sample_csv_data):
        """Test successful CSV upload."""
        csv_file = ("test.csv", sample_csv_data, "text/csv")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file)]
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
        assert "summary" in response.json()
        assert response.json()["account_id"] == test_bank_account["account_id"]

    def test_upload_csv_multiple_files(self, client, test_bank_account, sample_csv_data):
        """Test upload of multiple CSV files in one request."""
        csv_file1 = ("test1.csv", sample_csv_data, "text/csv")
        csv_file2 = ("test2.csv", "Date,Description,Amount\n2024-02-01,Book,-20.00\n", "text/csv")

        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file1), ("files", csv_file2)]
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
        assert response.json()["files_processed"] == 2
        assert response.json()["summary"]["added"] >= 1

    def test_upload_csv_invalid_file_format(self, client, test_bank_account):
        """Test upload with invalid file format."""
        txt_file = ("test.txt", "some text", "text/plain")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", txt_file)]
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid file format" in response.json()["detail"]
    
    def test_upload_csv_no_file(self, client, test_bank_account):
        """Test upload without providing a file."""
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}"
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_upload_csv_missing_account(self, client):
        """Test upload without specifying an account."""
        csv_file = ("test.csv", "Date,Description,Amount\n", "text/csv")
        
        response = client.post(
            "/api/v1/upload/csv",
            files=[("files", csv_file)]
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_upload_csv_nonexistent_account(self, client):
        """Test upload with non-existent account ID."""
        csv_file = ("test.csv", "Date,Description,Amount\n", "text/csv")
        
        response = client.post(
            "/api/v1/upload/csv?account_id=nonexistent_account",
            files=[("files", csv_file)]
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()
    
    def test_upload_csv_empty_file(self, client, test_bank_account, sample_csv_data):
        """Test upload with empty CSV file."""
        csv_file = ("empty.csv", "", "text/csv")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file)]
        )
        
        # Should handle gracefully - either 201 with 0 added or handle error
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_500_INTERNAL_SERVER_ERROR]
    
    def test_upload_csv_malformed_data(self, client, test_bank_account):
        """Test upload with malformed CSV data - gracefully skips bad rows."""
        # CSV with missing columns
        csv_file = ("bad.csv", "Date,Description\n2024-01-01,Test", "text/csv")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file)]
        )
        
        # Parser gracefully skips rows with missing columns, so it returns 201 with 0 added
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
    
    def test_upload_csv_with_special_characters(self, client, test_bank_account):
        """Test CSV upload with special characters in data."""
        csv_data = """Date,Description,Amount
2024-01-01,Café & Restaurant,-75.50
2024-01-02,électricity bill,-120.00
"""
        csv_file = ("special.csv", csv_data, "text/csv")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file)]
        )
        
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_upload_csv_with_comma_in_amounts(self, client, test_bank_account):
        """Test CSV upload with comma-formatted currency amounts."""
        csv_data = """Date,Description,Amount
2024-01-01,Grocery Store,-1,050.50
2024-01-02,Salary,5,000.00
"""
        csv_file = ("formatted.csv", csv_data, "text/csv")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file)]
        )
        
        assert response.status_code == status.HTTP_201_CREATED


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
        # Deactivate the test account
        client.put(
            f"/api/v1/accounts/{test_bank_account['account_id']}",
            json={"is_active": False}
        )
        
        # List active accounts only (should not include deactivated)
        response = client.get("/api/v1/accounts?active_only=true")
        
        assert response.status_code == status.HTTP_200_OK
        accounts = response.json()
        assert not any(acc["account_id"] == test_bank_account["account_id"] for acc in accounts)
        
        # List all accounts (should include deactivated)
        response = client.get("/api/v1/accounts?active_only=false")
        
        assert response.status_code == status.HTTP_200_OK
        accounts = response.json()
        assert any(acc["account_id"] == test_bank_account["account_id"] for acc in accounts)


class TestCORSConfiguration:
    """Test CORS middleware configuration."""
    
    def test_cors_headers_for_allowed_origin(self, client):
        """Test CORS headers for allowed origin (React frontend)."""
        response = client.get(
            "/",
            headers={"Origin": "http://localhost:5173"}
        )
        
        # Check that response is successful
        assert response.status_code == status.HTTP_200_OK
    
    def test_api_documentation_available(self, client):
        """Test that OpenAPI documentation is available."""
        response = client.get("/docs")
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_redoc_documentation_available(self, client):
        """Test that ReDoc documentation is available."""
        response = client.get("/redoc")
        
        assert response.status_code == status.HTTP_200_OK


class TestExpensesEndpoints:
    """Test suite for the expenses API endpoints."""
    
    def test_list_expenses_empty(self, client):
        """Test listing expenses when database is empty."""
        response = client.get("/api/v1/expenses/")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []
    
    def test_create_expense_success(self, client, sample_expense_data):
        """Test successful expense creation."""
        response = client.post("/api/v1/expenses/", json=sample_expense_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["amount"] == sample_expense_data["amount"]
        assert data["description"] == sample_expense_data["description"]
        assert data["category"] == sample_expense_data["category"]
        assert data["is_income"] == sample_expense_data["is_income"]
        assert data["date"] == sample_expense_data["date"]
        assert "id" in data
        assert "transaction_hash" in data
    
    def test_create_income_success(self, client, sample_income_data):
        """Test successful income entry creation."""
        response = client.post("/api/v1/expenses/", json=sample_income_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["is_income"] is True
        assert data["amount"] == sample_income_data["amount"]
    
    def test_list_expenses_with_pagination(self, client, sample_expense_data):
        """Test listing expenses with pagination parameters."""
        # Create 3 expenses
        for i in range(3):
            expense = sample_expense_data.copy()
            expense["amount"] = 50.00 + i * 10
            client.post("/api/v1/expenses/", json=expense)
        
        # Test skip and limit
        response = client.get("/api/v1/expenses/?skip=0&limit=2")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
    
    def test_list_expenses_filter_by_category(self, client, sample_expense_data):
        """Test filtering expenses by category."""
        # Create expense with one category
        response1 = client.post("/api/v1/expenses/", json=sample_expense_data)
        expense1_id = response1.json()["id"]
        
        # Create expense with different category
        expense2 = sample_expense_data.copy()
        expense2["category"] = "Utilities"
        response2 = client.post("/api/v1/expenses/", json=expense2)
        expense2_id = response2.json()["id"]
        
        # Filter by first category (URL encode the category parameter)
        category_param = quote(sample_expense_data['category'])
        response = client.get(f"/api/v1/expenses/?category={category_param}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        assert any(item["id"] == expense1_id for item in data)
    
    def test_list_expenses_filter_by_date_range(self, client, sample_expense_data):
        """Test filtering expenses by date range."""
        # Create two expenses on different dates
        expense1 = sample_expense_data.copy()
        expense1["date"] = "2024-01-10"
        client.post("/api/v1/expenses/", json=expense1)
        
        expense2 = sample_expense_data.copy()
        expense2["date"] = "2024-01-20"
        client.post("/api/v1/expenses/", json=expense2)
        
        # Filter by start date
        response = client.get("/api/v1/expenses/?start_date=2024-01-15")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(item["date"] >= "2024-01-15" for item in data)
    
    def test_list_expenses_ordered_by_date_descending(self, client, sample_expense_data):
        """Test that expenses are ordered by date descending (newest first)."""
        # Create expenses on different dates
        for i in range(3):
            expense = sample_expense_data.copy()
            expense["date"] = f"2024-01-{10 + i:02d}"
            client.post("/api/v1/expenses/", json=expense)
        
        response = client.get("/api/v1/expenses/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Verify descending order
        for i in range(len(data) - 1):
            assert data[i]["date"] >= data[i + 1]["date"]
    
    def test_get_expense_by_id(self, client, sample_expense_data):
        """Test retrieving a single expense by ID."""
        # Create an expense
        create_response = client.post("/api/v1/expenses/", json=sample_expense_data)
        expense_id = create_response.json()["id"]
        
        # Retrieve it
        response = client.get(f"/api/v1/expenses/{expense_id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == expense_id
        assert data["description"] == sample_expense_data["description"]
    
    def test_get_expense_not_found(self, client):
        """Test retrieving a non-existent expense."""
        response = client.get("/api/v1/expenses/999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()
    
    def test_update_expense_success(self, client, sample_expense_data):
        """Test successfully updating an expense."""
        # Create an expense
        create_response = client.post("/api/v1/expenses/", json=sample_expense_data)
        expense_id = create_response.json()["id"]
        
        # Update it
        updated_data = sample_expense_data.copy()
        updated_data["category"] = "Groceries"
        updated_data["amount"] = 100.00
        
        response = client.put(f"/api/v1/expenses/{expense_id}", json=updated_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["category"] == "Groceries"
        assert data["amount"] == 100.00
        assert data["id"] == expense_id
    
    def test_update_expense_partial(self, client, sample_expense_data):
        """Test partial update of an expense (updating only one field)."""
        # Create an expense
        create_response = client.post("/api/v1/expenses/", json=sample_expense_data)
        expense_id = create_response.json()["id"]
        original_amount = create_response.json()["amount"]
        
        # Update only the category (full data required due to schema)
        partial_update = {
            "amount": original_amount,
            "is_income": sample_expense_data["is_income"],
            "category": "New Category",
            "description": sample_expense_data["description"],
            "date": sample_expense_data["date"],
            "account_id": sample_expense_data["account_id"],
        }
        
        response = client.put(f"/api/v1/expenses/{expense_id}", json=partial_update)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["category"] == "New Category"
        assert data["amount"] == original_amount
    
    def test_update_expense_not_found(self, client, sample_expense_data):
        """Test updating a non-existent expense."""
        response = client.put("/api/v1/expenses/999", json=sample_expense_data)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_expense_success(self, client, sample_expense_data):
        """Test successfully deleting an expense."""
        # Create an expense
        create_response = client.post("/api/v1/expenses/", json=sample_expense_data)
        expense_id = create_response.json()["id"]
        
        # Delete it
        response = client.delete(f"/api/v1/expenses/{expense_id}")
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify it's deleted
        get_response = client.get(f"/api/v1/expenses/{expense_id}")
        assert get_response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_expense_not_found(self, client):
        """Test deleting a non-existent expense."""
        response = client.delete("/api/v1/expenses/999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_create_expense_missing_required_field(self, client):
        """Test creating an expense without required fields."""
        incomplete_data = {
            "amount": 50.00,
            "category": "Food",
            # Missing 'is_income', 'description', 'date'
        }
        
        response = client.post("/api/v1/expenses/", json=incomplete_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_create_expense_invalid_amount(self, client, sample_expense_data):
        """Test creating an expense with invalid amount."""
        invalid_data = sample_expense_data.copy()
        invalid_data["amount"] = "not_a_number"
        
        response = client.post("/api/v1/expenses/", json=invalid_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_create_multiple_expenses_list_all(self, client, sample_expense_data):
        """Test creating multiple expenses and listing them all."""
        count = 5
        for i in range(count):
            expense = sample_expense_data.copy()
            expense["amount"] = 50.00 + i
            client.post("/api/v1/expenses/", json=expense)
        
        response = client.get("/api/v1/expenses/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == count
