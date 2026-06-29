"""Tests for the category rules API endpoints."""
import pytest
from fastapi import status

from app.models.category import Category as CategoryModel
from app.models.category_rules import CategoryRule


class TestRulesEndpoints:
    """Test suite for the category rules API endpoints."""

    @pytest.fixture
    def category(self, db_session) -> CategoryModel:
        cat = CategoryModel(name="Groceries")
        db_session.add(cat)
        db_session.flush()
        return cat

    def test_list_rules_empty(self, client):
        """Returns paginated empty response when no rules exist."""
        response = client.get("/api/v1/rules/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_create_rule_success(self, client, category):
        """POST creates a rule and returns it with category details."""
        response = client.post(
            "/api/v1/rules/",
            json={"keyword": "Tesco", "match_field": "description", "category_id": category.id},
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["keyword"] == "tesco"
        assert data["match_field"] == "description"
        assert data["category_id"] == category.id

    def test_create_rule_normalises_keyword(self, client, category):
        """Keyword is lowercased and stripped."""
        response = client.post(
            "/api/v1/rules/",
            json={"keyword": "  AMAZON  ", "match_field": "description", "category_id": category.id},
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["keyword"] == "amazon"

    def test_create_rule_invalid_category_returns_404(self, client):
        """POST with non-existent category_id returns 404."""
        response = client.post(
            "/api/v1/rules/",
            json={"keyword": "test", "match_field": "description", "category_id": 9999},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_create_duplicate_rule_returns_409(self, client, category):
        """Creating the same keyword+match_field pair twice returns 400."""
        payload = {"keyword": "netflix", "match_field": "description", "category_id": category.id}
        client.post("/api/v1/rules/", json=payload)
        response = client.post("/api/v1/rules/", json=payload)
        assert response.status_code == status.HTTP_409_CONFLICT
        assert "already exists" in response.json()["detail"].lower()

    def test_list_rules_returns_created(self, client, category):
        """Listed rules include the one just created."""
        client.post(
            "/api/v1/rules/",
            json={"keyword": "costa", "match_field": "description", "category_id": category.id},
        )
        response = client.get("/api/v1/rules/")
        keywords = [r["keyword"] for r in response.json()["items"]]
        assert "costa" in keywords

    def test_list_rules_search_by_keyword(self, client, category):
        """q param filters rules by keyword."""
        client.post("/api/v1/rules/", json={"keyword": "mcdonalds", "match_field": "description", "category_id": category.id})
        client.post("/api/v1/rules/", json={"keyword": "starbucks", "match_field": "description", "category_id": category.id})
        response = client.get("/api/v1/rules/?q=mcdonalds")
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["keyword"] == "mcdonalds"

    def test_list_rules_pagination(self, client, category):
        """page and page_size params slice results correctly."""
        for i in range(5):
            client.post(
                "/api/v1/rules/",
                json={"keyword": f"shop{i}", "match_field": "description", "category_id": category.id},
            )
        response = client.get("/api/v1/rules/?page=1&page_size=2")
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["pages"] == 3

    def test_delete_rule_success(self, client, category):
        """DELETE removes the rule and it no longer appears in list."""
        create_resp = client.post(
            "/api/v1/rules/",
            json={"keyword": "toDelete", "match_field": "description", "category_id": category.id},
        )
        rule_id = create_resp.json()["id"]
        response = client.delete(f"/api/v1/rules/{rule_id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        list_resp = client.get("/api/v1/rules/")
        ids = [r["id"] for r in list_resp.json()["items"]]
        assert rule_id not in ids

    def test_delete_nonexistent_rule_returns_404(self, client):
        """DELETE on a non-existent rule returns 404."""
        response = client.delete("/api/v1/rules/9999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
