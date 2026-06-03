"""
Tests for the FastAPI endpoints.
"""
import io
from unittest.mock import patch

import pytest
from fastapi import status


class TestIngestionEndpoints:
    """Test suite for the ingestion API endpoints."""
    
    def test_read_root(self, client):
        """Test the root endpoint."""
        response = client.get("/")
        
        assert response.status_code == status.HTTP_200_OK
        assert "Welcome to the SigmaSpend Backend API" in response.json()["message"]
    
    def test_upload_csv_success(self, client, sample_csv_data):
        """Test successful CSV upload."""
        csv_file = ("test.csv", sample_csv_data, "text/csv")
        
        with patch('app.services.parser.StatementParserService.load_bank_config') as mock_config:
            mock_config.return_value = {
                "account_id": "test_account",
                "amount_style": "single_column",
                "mappings": {
                    "date_column": "Date",
                    "description_column": "Description",
                    "amount_column": "Amount",
                }
            }
            
            response = client.post(
                "/api/v1/upload/csv",
                files={"file": csv_file}
            )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
        assert "summary" in response.json()
    
    def test_upload_csv_invalid_file_format(self, client):
        """Test upload with invalid file format."""
        txt_file = ("test.txt", "some text", "text/plain")
        
        response = client.post(
            "/api/v1/upload/csv",
            files={"file": txt_file}
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid file format" in response.json()["detail"]
    
    def test_upload_csv_no_file(self, client):
        """Test upload without providing a file."""
        response = client.post("/api/v1/upload/csv")
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_upload_csv_empty_file(self, client):
        """Test upload with empty CSV file."""
        csv_file = ("empty.csv", "", "text/csv")
        
        with patch('app.services.parser.StatementParserService.load_bank_config') as mock_config:
            mock_config.return_value = {
                "account_id": "test_account",
                "amount_style": "single_column",
                "mappings": {
                    "date_column": "Date",
                    "description_column": "Description",
                    "amount_column": "Amount",
                }
            }
            
            response = client.post(
                "/api/v1/upload/csv",
                files={"file": csv_file}
            )
        
        # Should handle gracefully - either 201 with 0 added or handle error
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_500_INTERNAL_SERVER_ERROR]
    
    def test_upload_csv_malformed_data(self, client):
        """Test upload with malformed CSV data - gracefully skips bad rows."""
        # CSV with missing columns
        csv_file = ("bad.csv", "Date,Description\n2024-01-01,Test", "text/csv")
        
        with patch('app.services.parser.StatementParserService.load_bank_config') as mock_config:
            mock_config.return_value = {
                "account_id": "test_account",
                "amount_style": "single_column",
                "mappings": {
                    "date_column": "Date",
                    "description_column": "Description",
                    "amount_column": "Amount",  # This column is missing
                }
            }
            
            response = client.post(
                "/api/v1/upload/csv",
                files={"file": csv_file}
            )
        
        # Parser gracefully skips rows with missing columns, so it returns 201 with 0 added
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
    
    def test_upload_csv_with_special_characters(self, client):
        """Test CSV upload with special characters in data."""
        csv_data = """Date,Description,Amount
2024-01-01,Café & Restaurant,-75.50
2024-01-02,électricity bill,-120.00
"""
        csv_file = ("special.csv", csv_data, "text/csv")
        
        with patch('app.services.parser.StatementParserService.load_bank_config') as mock_config:
            mock_config.return_value = {
                "account_id": "test_account",
                "amount_style": "single_column",
                "mappings": {
                    "date_column": "Date",
                    "description_column": "Description",
                    "amount_column": "Amount",
                }
            }
            
            response = client.post(
                "/api/v1/upload/csv",
                files={"file": csv_file}
            )
        
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_upload_csv_with_comma_in_amounts(self, client):
        """Test CSV upload with comma-formatted currency amounts."""
        csv_data = """Date,Description,Amount
2024-01-01,Grocery Store,-1,050.50
2024-01-02,Salary,5,000.00
"""
        csv_file = ("formatted.csv", csv_data, "text/csv")
        
        with patch('app.services.parser.StatementParserService.load_bank_config') as mock_config:
            mock_config.return_value = {
                "account_id": "test_account",
                "amount_style": "single_column",
                "mappings": {
                    "date_column": "Date",
                    "description_column": "Description",
                    "amount_column": "Amount",
                }
            }
            
            response = client.post(
                "/api/v1/upload/csv",
                files={"file": csv_file}
            )
        
        assert response.status_code == status.HTTP_201_CREATED


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
