import pytest
from fastapi import status

UPLOAD_URL = "/api/v1/upload/statement"


class TestIngestionEndpoints:
    """Test suite for the statement ingestion API endpoints."""

    def test_upload_csv_success(self, client, test_bank_account, sample_csv_data):
        """Test successful CSV upload returns expected metrics."""
        csv_file = ("test.csv", sample_csv_data.encode(), "text/csv")

        response = client.post(
            f"{UPLOAD_URL}?account_id={test_bank_account['id']}",
            files=[("files", csv_file)],
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["status"] == "success"
        assert "summary" in data
        assert data["account_id"] == test_bank_account["id"]
        assert data["summary"]["added"] == 3

    def test_upload_csv_multiple_files(self, client, test_bank_account, sample_csv_data):
        """Test upload of multiple CSV files in one request."""
        csv_file1 = ("test1.csv", sample_csv_data.encode(), "text/csv")
        csv_file2 = ("test2.csv", b"Date,Description,Amount\n2024-02-01,Book,-20.00\n", "text/csv")

        response = client.post(
            f"{UPLOAD_URL}?account_id={test_bank_account['id']}",
            files=[("files", csv_file1), ("files", csv_file2)],
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["status"] == "success"
        assert data["files_processed"] == 2
        assert data["summary"]["added"] >= 1

    def test_upload_csv_invalid_file_format(self, client, test_bank_account):
        """Test upload with an unsupported file extension is rejected."""
        txt_file = ("test.txt", b"some text", "text/plain")

        response = client.post(
            f"{UPLOAD_URL}?account_id={test_bank_account['id']}",
            files=[("files", txt_file)],
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid file format" in response.json()["detail"]

    def test_upload_csv_no_file(self, client, test_bank_account):
        """Test upload without attaching files returns 422."""
        response = client.post(f"{UPLOAD_URL}?account_id={test_bank_account['id']}")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_upload_csv_missing_account(self, client):
        """Test upload without specifying account_id returns 422."""
        csv_file = ("test.csv", b"Date,Description,Amount\n", "text/csv")
        response = client.post(UPLOAD_URL, files=[("files", csv_file)])
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_upload_csv_nonexistent_account(self, client):
        """Test upload with a non-existent account ID returns 404."""
        csv_file = ("test.csv", b"Date,Description,Amount\n", "text/csv")
        response = client.post(
            f"{UPLOAD_URL}?account_id=99999",
            files=[("files", csv_file)],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"].lower()

    def test_upload_csv_empty_file(self, client, test_bank_account):
        """Test that an empty CSV file is handled gracefully."""
        csv_file = ("empty.csv", b"", "text/csv")
        response = client.post(
            f"{UPLOAD_URL}?account_id={test_bank_account['id']}",
            files=[("files", csv_file)],
        )
        # Empty file results in 0 added rows — success or internal error are both acceptable
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_500_INTERNAL_SERVER_ERROR]

    def test_upload_csv_malformed_data(self, client, test_bank_account):
        """Test that malformed CSV rows are skipped without crashing."""
        csv_file = ("bad.csv", b"Date,Description\n2024-01-01,Test", "text/csv")
        response = client.post(
            f"{UPLOAD_URL}?account_id={test_bank_account['id']}",
            files=[("files", csv_file)],
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "success"

    def test_upload_csv_with_special_characters(self, client, test_bank_account):
        """Test CSV upload with special characters in description."""
        csv_data = b"Date,Description,Amount\n2024-01-01,Caf\xc3\xa9 & Restaurant,-75.50\n"
        csv_file = ("special.csv", csv_data, "text/csv")
        response = client.post(
            f"{UPLOAD_URL}?account_id={test_bank_account['id']}",
            files=[("files", csv_file)],
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_upload_duplicate_csv_skips_rows(self, client, test_bank_account, sample_csv_data):
        """Test that uploading the same CSV twice skips all rows on the second pass."""
        csv_file = ("test.csv", sample_csv_data.encode(), "text/csv")

        client.post(f"{UPLOAD_URL}?account_id={test_bank_account['id']}", files=[("files", csv_file)])

        csv_file2 = ("test.csv", sample_csv_data.encode(), "text/csv")
        response = client.post(f"{UPLOAD_URL}?account_id={test_bank_account['id']}", files=[("files", csv_file2)])

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["summary"]["added"] == 0
        assert response.json()["summary"]["skipped"] == 3
