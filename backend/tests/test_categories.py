"""Tests for the categories API endpoints."""
import pytest
from fastapi import status

from app.models.category import Category as CategoryModel


class TestCategoriesEndpoints:
    """Test suite for the categories API endpoints."""

    def test_list_categories_empty(self, client):
        """Returns an empty list when no categories exist."""
        response = client.get("/api/v1/categories/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_create_category_success(self, client):
        """POST creates a category and returns it with normalised name."""
        response = client.post("/api/v1/categories/", json={"name": "groceries"})
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Groceries"
        assert "id" in data

    def test_create_category_normalises_name(self, client):
        """Category name is title-cased and whitespace-stripped."""
        response = client.post("/api/v1/categories/", json={"name": "  fast food  "})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["name"] == "Fast Food"

    def test_create_duplicate_category_returns_400(self, client):
        """Creating a category with the same name twice returns 400."""
        client.post("/api/v1/categories/", json={"name": "Transport"})
        response = client.post("/api/v1/categories/", json={"name": "transport"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"].lower()

    def test_list_categories_returns_created(self, client):
        """Listed categories include the one just created."""
        client.post("/api/v1/categories/", json={"name": "Entertainment"})
        response = client.get("/api/v1/categories/")
        names = [c["name"] for c in response.json()]
        assert "Entertainment" in names

    def test_list_categories_sorted_alphabetically(self, client):
        """Root categories are returned in ascending alphabetical order."""
        client.post("/api/v1/categories/", json={"name": "Zebra"})
        client.post("/api/v1/categories/", json={"name": "Apple"})
        response = client.get("/api/v1/categories/")
        names = [c["name"] for c in response.json()]
        assert names == sorted(names)

    def test_create_subcategory(self, client):
        """Creating a category with parent_id nests it under the parent."""
        parent_resp = client.post("/api/v1/categories/", json={"name": "Food"})
        parent_id = parent_resp.json()["id"]
        response = client.post("/api/v1/categories/", json={"name": "Restaurants", "parent_id": parent_id})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["parent_id"] == parent_id

    def test_update_bucket_success(self, client, db_session):
        """PATCH /{id}/bucket sets the bucket field."""
        cat = CategoryModel(name="Bills")
        db_session.add(cat)
        db_session.flush()

        response = client.patch(f"/api/v1/categories/{cat.id}/bucket", json={"bucket": "50_needs"})
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["bucket"] == "50_needs"

    def test_update_bucket_not_found(self, client):
        """PATCH on a non-existent category returns 404."""
        response = client.patch("/api/v1/categories/9999/bucket", json={"bucket": "30_wants"})
        assert response.status_code == status.HTTP_404_NOT_FOUND
