import pytest
from fastapi import status


class TestIngestionEndpoints:
    """Test suite for the ingestion API endpoints."""
    
    def test_upload_csv_success(self, client, test_bank_account, sample_csv_data):
        """Test successful CSV upload."""
        csv_file = ("test.csv", sample_csv_data, "text/csv")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file)]
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
        assert "summary" in response.json()
        assert response.json()["account_id"] == test_bank_account["account_id"]

    def test_upload_csv_multiple_files(self, client, test_bank_account, sample_csv_data):
        """Test upload of multiple CSV files in one request."""
        csv_file1 = ("test1.csv", sample_csv_data, "text/csv")
        csv_file2 = ("test2.csv", "Date,Description,Amount\n2024-02-01,Book,-20.00\n", "text/csv")

        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file1), ("files", csv_file2)]
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
        assert response.json()["files_processed"] == 2
        assert response.json()["summary"]["added"] >= 1

    def test_upload_csv_invalid_file_format(self, client, test_bank_account):
        """Test upload with invalid file format."""
        txt_file = ("test.txt", "some text", "text/plain")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", txt_file)]
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid file format" in response.json()["detail"]
    
    def test_upload_csv_no_file(self, client, test_bank_account):
        """Test upload without providing a file."""
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}"
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_upload_csv_missing_account(self, client):
        """Test upload without specifying an account."""
        csv_file = ("test.csv", "Date,Description,Amount\n", "text/csv")
        
        response = client.post(
            "/api/v1/upload/csv",
            files=[("files", csv_file)]
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_upload_csv_nonexistent_account(self, client):
        """Test upload with non-existent account ID."""
        csv_file = ("test.csv", "Date,Description,Amount\n", "text/csv")
        
        response = client.post(
            "/api/v1/upload/csv?account_id=nonexistent_account",
            files=[("files", csv_file)]
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()
    
    def test_upload_csv_empty_file(self, client, test_bank_account, sample_csv_data):
        """Test upload with empty CSV file."""
        csv_file = ("empty.csv", "", "text/csv")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file)]
        )
        
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_500_INTERNAL_SERVER_ERROR]
    
    def test_upload_csv_malformed_data(self, client, test_bank_account):
        """Test upload with malformed CSV data - gracefully skips bad rows."""
        csv_file = ("bad.csv", "Date,Description\n2024-01-01,Test", "text/csv")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file)]
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"
    
    def test_upload_csv_with_special_characters(self, client, test_bank_account):
        """Test CSV upload with special characters in data."""
        csv_data = """Date,Description,Amount
2024-01-01,Café & Restaurant,-75.50
2024-01-02,électricity bill,-120.00
"""
        csv_file = ("special.csv", csv_data, "text/csv")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file)]
        )
        
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_upload_csv_with_comma_in_amounts(self, client, test_bank_account):
        """Test CSV upload with comma-formatted currency amounts."""
        csv_data = """Date,Description,Amount
2024-01-01,Grocery Store,-1,050.50
2024-01-02,Salary,5,000.00
"""
        csv_file = ("formatted.csv", csv_data, "text/csv")
        
        response = client.post(
            f"/api/v1/upload/csv?account_id={test_bank_account['account_id']}",
            files=[("files", csv_file)]
        )
        
        assert response.status_code == status.HTTP_201_CREATED
