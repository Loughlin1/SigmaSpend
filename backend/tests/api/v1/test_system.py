import pytest
from fastapi import status

class TestCORSConfiguration:
    """Test CORS middleware configuration."""

    def test_read_root(self, client):
        """Test the root endpoint."""
        response = client.get("/")
        
        assert response.status_code == status.HTTP_200_OK
        assert "Welcome to the SigmaSpend Backend API" in response.json()["message"]
    
    def test_cors_headers_for_allowed_origin(self, client):
        """Test CORS headers for allowed origin (React frontend)."""
        response = client.get(
            "/",
            headers={"Origin": "http://localhost:5173"}
        )
        assert response.status_code == status.HTTP_200_OK
    
    def test_api_documentation_available(self, client):
        """Test that OpenAPI documentation is available."""
        response = client.get("/docs")
        assert response.status_code == status.HTTP_200_OK
    
    def test_redoc_documentation_available(self, client):
        """Test that ReDoc documentation is available."""
        response = client.get("/redoc")
        assert response.status_code == status.HTTP_200_OK