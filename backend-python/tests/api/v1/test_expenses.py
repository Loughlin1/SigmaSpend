import pytest
from fastapi import status


class TestExpensesEndpoints:
    """Test suite for the expenses API endpoints."""

    def test_list_expenses_empty(self, client):
        """Test listing expenses when database is empty returns paginated envelope."""
        response = client.get("/api/v1/expenses/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items"] == []
        assert data["total_count"] == 0

    def test_create_expense_success(self, client, sample_expense_data):
        """Test successful expense creation."""
        response = client.post("/api/v1/expenses/", json=sample_expense_data)
        assert response.status_code == status.HTTP_201_CREATED

        data = response.json()
        assert data["amount"] == sample_expense_data["amount"]
        assert data["description"] == sample_expense_data["description"]
        assert data["is_income"] == sample_expense_data["is_income"]
        assert data["date"] == "15/01/2024"
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
            expense["description"] = f"Pagination Coffee {i}"
            client.post("/api/v1/expenses/", json=expense)

        response = client.get("/api/v1/expenses/?skip=0&limit=2")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 2

    def test_list_expenses_filter_by_date_range(self, client, sample_expense_data):
        """Test filtering expenses by date range."""
        expense1 = sample_expense_data.copy()
        expense1["date"] = "2024-01-10"
        expense1["description"] = "Date Range Inbound A"
        client.post("/api/v1/expenses/", json=expense1)

        expense2 = sample_expense_data.copy()
        expense2["date"] = "2024-01-20"
        expense2["description"] = "Date Range Inbound B"
        client.post("/api/v1/expenses/", json=expense2)

        response = client.get("/api/v1/expenses/?start_date=2024-01-15")
        assert response.status_code == status.HTTP_200_OK
        items = response.json()["items"]
        assert len(items) >= 1
        for item in items:
            assert item["date"] == "20/01/2024"

    def test_list_expenses_ordered_by_date_descending(self, client, sample_expense_data):
        """Test that expenses are ordered by date descending."""
        for i in range(3):
            expense = sample_expense_data.copy()
            expense["date"] = f"2024-01-{10 + i:02d}"
            expense["description"] = f"Descending Item {i}"
            client.post("/api/v1/expenses/", json=expense)

        response = client.get("/api/v1/expenses/")
        assert response.status_code == status.HTTP_200_OK
        items = response.json()["items"]
        assert len(items) >= 3
        assert items[0]["date"] == "12/01/2024"
        assert items[1]["date"] == "11/01/2024"
        assert items[2]["date"] == "10/01/2024"

    def test_get_expense_by_id(self, client, sample_expense_data):
        """Test retrieving a single expense by ID."""
        create_response = client.post("/api/v1/expenses/", json=sample_expense_data)
        expense_id = create_response.json()["id"]

        response = client.get(f"/api/v1/expenses/{expense_id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == expense_id
        assert response.json()["description"] == sample_expense_data["description"]

    def test_get_expense_not_found(self, client):
        """Test retrieving a non-existent expense."""
        response = client.get("/api/v1/expenses/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()

    def test_update_expense_success(self, client, sample_expense_data):
        """Test successfully updating an expense."""
        create_response = client.post("/api/v1/expenses/", json=sample_expense_data)
        expense_id = create_response.json()["id"]

        updated_payload = sample_expense_data.copy()
        updated_payload["amount"] = 100.00
        updated_payload["date"] = "2024-01-15"

        response = client.put(f"/api/v1/expenses/{expense_id}", json=updated_payload)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["amount"] == 100.00
        assert data["id"] == expense_id

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
        response = client.post("/api/v1/expenses/", json={"amount": 50.00})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_expense_invalid_amount(self, client, sample_expense_data):
        """Test creating an expense with invalid amount."""
        invalid_data = sample_expense_data.copy()
        invalid_data["amount"] = "not_a_number"
        response = client.post("/api/v1/expenses/", json=invalid_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_multiple_expenses_total_count(self, client, sample_expense_data):
        """Test total_count reflects all created expenses."""
        for i in range(5):
            expense = sample_expense_data.copy()
            expense["amount"] = 50.00 + i
            expense["description"] = f"List Multi Item {i}"
            client.post("/api/v1/expenses/", json=expense)

        response = client.get("/api/v1/expenses/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_count"] == 5
        assert len(data["items"]) == 5

    def test_bulk_classify(self, client, sample_expense_data):
        """Test bulk category assignment."""
        ids = []
        for i in range(3):
            exp = sample_expense_data.copy()
            exp["description"] = f"Bulk Classify Item {i}"
            r = client.post("/api/v1/expenses/", json=exp)
            ids.append(r.json()["id"])

        response = client.post("/api/v1/expenses/bulk-classify", json={"expense_ids": ids, "category_id": None})
        assert response.status_code == status.HTTP_200_OK

    def test_bulk_delete(self, client, sample_expense_data):
        """Test bulk deletion removes all targeted records."""
        ids = []
        for i in range(3):
            exp = sample_expense_data.copy()
            exp["description"] = f"Bulk Delete Item {i}"
            r = client.post("/api/v1/expenses/", json=exp)
            ids.append(r.json()["id"])

        response = client.post("/api/v1/expenses/bulk-delete", json={"expense_ids": ids})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["deleted"] == 3

        remaining = client.get("/api/v1/expenses/").json()["total_count"]
        assert remaining == 0

    def test_bulk_update_type(self, client, sample_expense_data):
        """Test bulk toggle of is_income flag."""
        ids = []
        for i in range(2):
            exp = sample_expense_data.copy()
            exp["description"] = f"Toggle Type Item {i}"
            r = client.post("/api/v1/expenses/", json=exp)
            ids.append(r.json()["id"])

        response = client.post("/api/v1/expenses/bulk-update-type", json={"expense_ids": ids, "is_income": True})
        assert response.status_code == status.HTTP_200_OK

        for expense_id in ids:
            item = client.get(f"/api/v1/expenses/{expense_id}").json()
            assert item["is_income"] is True
