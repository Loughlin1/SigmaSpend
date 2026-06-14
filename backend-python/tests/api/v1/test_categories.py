import pytest
from fastapi import status



class TestCategoriesEndpoints:
    """Test suite for the categories API endpoints."""
    
    def test_read_categories(self, client):
        """Test for reading categories when database is empty"""
        response = client.get("/api/v1/categories")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_create_category_success(self, client):
        """Test for successful creation of a category and a subcategory"""
        category_payload = {
            "name": "Housing & Bills",
            # "icon": "🏡",
            "parent_id": None
        }

        response = client.post("/api/v1/categories/", json=category_payload)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "id" in data
        assert data["name"] == "Housing & Bills"
        # assert data["icon"] == "🏡"
        
        category_id = data["id"]

        subcategory_payload = {
            "name": "Rent",
            "icon": None,
            "parent_id": category_id
        }

        response = client.post("/api/v1/categories/", json=subcategory_payload)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "id" in data
        assert data["name"] == "Rent"
        assert data["parent_id"] == category_id


    def test_create_duplicate_category_fails(self, client):
        """Test that adding an existing category payload fires a conflict error."""
        category_payload = {
            "name": "Food & Drink",
            "icon": "🍽️",
            "parent_id": None
        }
        
        client.post("/api/v1/categories/", json=category_payload)
        
        duplicate_payload = {
            "name": "Food & Drink",
            "icon": "🍽️",
            "parent_id": None
        }
        response = client.post("/api/v1/categories/", json=duplicate_payload)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"].lower()