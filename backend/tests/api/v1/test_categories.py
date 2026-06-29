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
        
        assert response.status_code == status.HTTP_409_CONFLICT
        assert "already exists" in response.json()["detail"].lower()

    def test_list_categories_returns_created_root_category(self, client):
        """Categories created should appear in the listing."""
        client.post("/api/v1/categories/", json={"name": "Transport", "parent_id": None})

        response = client.get("/api/v1/categories/")
        assert response.status_code == status.HTTP_200_OK
        names = [c["name"] for c in response.json()]
        assert "Transport" in names

    def test_list_excludes_subcategories_at_root(self, client):
        """Only root categories (parent_id=None) should appear in the listing."""
        r = client.post("/api/v1/categories/", json={"name": "Food", "parent_id": None})
        parent_id = r.json()["id"]
        client.post("/api/v1/categories/", json={"name": "Groceries", "parent_id": parent_id})

        response = client.get("/api/v1/categories/")
        names = [c["name"] for c in response.json()]
        assert "Food" in names
        assert "Groceries" not in names

    def test_subcategory_nested_in_parent_response(self, client):
        """When fetching categories the subcategories list should be populated."""
        r = client.post("/api/v1/categories/", json={"name": "Entertainment", "parent_id": None})
        parent_id = r.json()["id"]
        client.post("/api/v1/categories/", json={"name": "Streaming", "parent_id": parent_id})

        response = client.get("/api/v1/categories/")
        parent = next(c for c in response.json() if c["name"] == "Entertainment")
        sub_names = [s["name"] for s in parent.get("subcategories", [])]
        assert "Streaming" in sub_names

    def test_category_name_is_title_cased(self, client):
        """The endpoint normalises names to title case before saving."""
        response = client.post("/api/v1/categories/", json={"name": "food and drink", "parent_id": None})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["name"] == "Food And Drink"

    def test_create_category_missing_name_returns_422(self, client):
        """A missing name field should be rejected by Pydantic validation."""
        response = client.post("/api/v1/categories/", json={"parent_id": None})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_list_categories_ordered_alphabetically(self, client):
        """Categories should be returned in ascending alphabetical order."""
        for name in ["Zebra", "Apple", "Mango"]:
            client.post("/api/v1/categories/", json={"name": name, "parent_id": None})

        names = [c["name"] for c in client.get("/api/v1/categories/").json()]
        assert names == sorted(names)