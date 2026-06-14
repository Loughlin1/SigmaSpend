import pytest
from urllib.parse import quote
from fastapi import status


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
        for i in range(3):
            expense = sample_expense_data.copy()
            expense["amount"] = 50.00 + i * 10
            # Explicit uniquely generated hashes prevent SQLite unique collisions
            expense["transaction_hash"] = f"hash_pag_{i}"
            client.post("/api/v1/expenses/", json=expense)
        
        response = client.get("/api/v1/expenses/?skip=0&limit=2")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
    
    def test_list_expenses_filter_by_category(self, client, sample_expense_data):
        """Test filtering expenses by category."""
        expense1 = sample_expense_data.copy()
        expense1["transaction_hash"] = "hash_cat_1"
        response1 = client.post("/api/v1/expenses/", json=expense1)
        expense1_id = response1.json()["id"]
        
        expense2 = sample_expense_data.copy()
        expense2["category"] = "Utilities"
        expense2["transaction_hash"] = "hash_cat_2"
        response2 = client.post("/api/v1/expenses/", json=expense2)
        
        category_param = quote(sample_expense_data['category'])
        response = client.get(f"/api/v1/expenses/?category={category_param}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        assert any(item["id"] == expense1_id for item in data)
    
    def test_list_expenses_filter_by_date_range(self, client, sample_expense_data):
        """Test filtering expenses by date range."""
        expense1 = sample_expense_data.copy()
        expense1["date"] = "2024-01-10"
        expense1["transaction_hash"] = "hash_date_1"
        client.post("/api/v1/expenses/", json=expense1)
        
        expense2 = sample_expense_data.copy()
        expense2["date"] = "2024-01-20"
        expense2["transaction_hash"] = "hash_date_2"
        client.post("/api/v1/expenses/", json=expense2)
        
        response = client.get("/api/v1/expenses/?start_date=2024-01-15")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(item["date"] >= "2024-01-15" for item in data)
    
    def test_list_expenses_ordered_by_date_descending(self, client, sample_expense_data):
        """Test that expenses are ordered by date descending (newest first)."""
        for i in range(3):
            expense = sample_expense_data.copy()
            expense["date"] = f"2024-01-{10 + i:02d}"
            expense["transaction_hash"] = f"hash_desc_{i}"
            client.post("/api/v1/expenses/", json=expense)
        
        response = client.get("/api/v1/expenses/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for i in range(len(data) - 1):
            assert data[i]["date"] >= data[i + 1]["date"]
    
    def test_get_expense_by_id(self, client, sample_expense_data):
        """Test retrieving a single expense by ID."""
        create_response = client.post("/api/v1/expenses/", json=sample_expense_data)
        expense_id = create_response.json()["id"]
        
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
        create_response = client.post("/api/v1/expenses/", json=sample_expense_data)
        expense_id = create_response.json()["id"]
        
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
        create_response = client.post("/api/v1/expenses/", json=sample_expense_data)
        expense_id = create_response.json()["id"]
        original_amount = create_response.json()["amount"]
        
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
        create_response = client.post("/api/v1/expenses/", json=sample_expense_data)
        expense_id = create_response.json()["id"]
        
        response = client.delete(f"/api/v1/expenses/{expense_id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
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
            expense["transaction_hash"] = f"hash_list_{i}"
            client.post("/api/v1/expenses/", json=expense)
        
        response = client.get("/api/v1/expenses/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == count