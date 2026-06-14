import pytest
from fastapi import status

class TestCategoryRulesEndpoints:
    """Test suite for the processing rules engine API endpoints."""

    def test_list_rules_empty(self, client):
        """Test listing categorization rules when database is empty."""
        response = client.get("/api/v1/rules/")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_create_rule_success(self, client):
        """Test successful creation of an explicit keyword rule."""
        rule_payload = {
            "keyword": "Starbucks",
            "target_category": "Coffee Shops"
        }
        
        response = client.post("/api/v1/rules/", json=rule_payload)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "id" in data
        assert data["keyword"] == "starbucks"
        assert data["target_category"] == "Coffee Shops"

    def test_create_duplicate_rule_fails(self, client):
        """Test that adding an existing keyword payload fires a conflict error."""
        rule_payload = {
            "keyword": "netflix",
            "target_category": "Subscriptions"
        }
        
        client.post("/api/v1/rules/", json=rule_payload)
        
        duplicate_payload = {
            "keyword": "NETFLIX",
            "target_category": "Streaming Services"
        }
        response = client.post("/api/v1/rules/", json=duplicate_payload)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"].lower()

    def test_list_rules_populated(self, client):
        """Test that registered rules are listed in alphabetical order."""
        rules_to_seed = [
            {"keyword": "tfl", "target_category": "Transport"},
            {"keyword": "sainsburys", "target_category": "Groceries"}
        ]
        
        for rule in rules_to_seed:
            client.post("/api/v1/rules/", json=rule)
            
        response = client.get("/api/v1/rules/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 2
        keywords = [r["keyword"] for r in data]
        assert keywords == sorted(keywords)

    def test_delete_rule_success(self, client):
        """Test successfully removing an operational keyword rule."""
        rule_payload = {
            "keyword": "uber",
            "target_category": "Transport"
        }
        create_response = client.post("/api/v1/rules/", json=rule_payload)
        rule_id = create_response.json()["id"]
        
        delete_response = client.delete(f"/api/v1/rules/{rule_id}")
        assert delete_response.status_code == status.HTTP_204_NO_CONTENT
        
        get_response = client.get("/api/v1/rules/")
        assert not any(item["id"] == rule_id for item in get_response.json())

    def test_delete_rule_not_found(self, client):
        """Test that removing a non-existent rule primary key returns a 404."""
        response = client.delete("/api/v1/rules/9999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()

    def test_create_rule_missing_fields(self, client):
        """Test structural pydantic schema rejection for missing data payloads."""
        incomplete_payload = {
            "keyword": "malformed_entry"
        }
        response = client.post("/api/v1/rules/", json=incomplete_payload)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY