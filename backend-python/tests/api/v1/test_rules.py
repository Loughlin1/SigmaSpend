import pytest
from fastapi import status
from app.models.category import Category


@pytest.fixture
def test_category_id(db_session) -> int:
    """Seed a category directly so rule creation has a valid FK target."""
    cat = Category(name="Transport", icon="🚌")
    db_session.add(cat)
    db_session.flush()
    return cat.id


class TestCategoryRulesEndpoints:
    """Test suite for the processing rules engine API endpoints."""

    def test_list_rules_empty(self, client):
        """Test listing rules when database is empty returns paginated envelope."""
        response = client.get("/api/v1/rules/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    def test_create_rule_success(self, client, test_category_id):
        """Test successful creation of a keyword rule."""
        payload = {
            "keyword": "tfl",
            "match_field": "description",
            "category_id": test_category_id,
        }
        response = client.post("/api/v1/rules/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "id" in data
        assert data["keyword"] == "tfl"
        assert data["category_id"] == test_category_id

    def test_create_duplicate_rule_fails(self, client, test_category_id):
        """Test that adding a duplicate keyword + match_field raises a conflict."""
        payload = {"keyword": "netflix", "match_field": "description", "category_id": test_category_id}
        client.post("/api/v1/rules/", json=payload)

        response = client.post("/api/v1/rules/", json=payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"].lower()

    def test_list_rules_populated(self, client, test_category_id):
        """Test that created rules appear in the paginated list."""
        for kw in ["uber", "sainsburys"]:
            client.post("/api/v1/rules/", json={"keyword": kw, "match_field": "description", "category_id": test_category_id})

        response = client.get("/api/v1/rules/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] >= 2

    def test_delete_rule_success(self, client, test_category_id):
        """Test successfully removing a rule."""
        create_response = client.post("/api/v1/rules/", json={"keyword": "uber", "match_field": "description", "category_id": test_category_id})
        rule_id = create_response.json()["id"]

        delete_response = client.delete(f"/api/v1/rules/{rule_id}")
        assert delete_response.status_code == status.HTTP_204_NO_CONTENT

        items = client.get("/api/v1/rules/").json()["items"]
        assert not any(item["id"] == rule_id for item in items)

    def test_delete_rule_not_found(self, client):
        """Test that removing a non-existent rule returns 404."""
        response = client.delete("/api/v1/rules/9999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()

    def test_create_rule_missing_fields(self, client):
        """Test that missing required fields are rejected."""
        response = client.post("/api/v1/rules/", json={"keyword": "malformed_entry"})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
