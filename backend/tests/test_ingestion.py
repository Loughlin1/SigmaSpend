"""Tests for the ingestion API endpoint."""
import io
import pytest
from fastapi import status

from app.models.bank_account import BankAccount


class TestIngestionEndpoint:
    """Test suite for the statement upload API endpoint."""

    def test_upload_no_files_returns_422(self, client, test_bank_account):
        """Posting with no files returns 422 (FastAPI validation rejects missing required field)."""
        response = client.post(
            f"/api/v1/upload/statement?account_id={test_bank_account['id']}",
            files=[],
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_upload_invalid_extension_returns_400(self, client, test_bank_account):
        """Uploading a .txt file returns 400."""
        response = client.post(
            f"/api/v1/upload/statement?account_id={test_bank_account['id']}",
            files=[("files", ("bad.txt", b"some content", "text/plain"))],
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "invalid file format" in response.json()["detail"].lower()

    def test_upload_nonexistent_account_returns_404(self, client):
        """Uploading to a non-existent account returns 404."""
        response = client.post(
            "/api/v1/upload/statement?account_id=9999",
            files=[("files", ("data.csv", b"Date,Description,Amount\n", "text/csv"))],
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_upload_inactive_account_returns_400(self, client, db_session):
        """Uploading to an inactive account returns 400."""
        inactive = BankAccount(
            account_name="Inactive Account",
            bank_name="Test Bank",
            amount_style="single_column",
            invert_amounts=False,
            is_active=False,
            mappings={"date_column": "Date", "description_column": "Description", "amount_column": "Amount"},
        )
        db_session.add(inactive)
        db_session.flush()

        response = client.post(
            f"/api/v1/upload/statement?account_id={inactive.id}",
            files=[("files", ("data.csv", b"Date,Description,Amount\n", "text/csv"))],
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "inactive" in response.json()["detail"].lower()

    def test_upload_valid_csv_returns_summary(self, client, test_bank_account):
        """A valid CSV upload returns a success summary."""
        csv_content = b"Date,Description,Amount\n2024-01-01,Test Shop,-25.00\n"
        response = client.post(
            f"/api/v1/upload/statement?account_id={test_bank_account['id']}",
            files=[("files", ("statement.csv", csv_content, "text/csv"))],
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["status"] == "success"
        assert data["account_id"] == test_bank_account["id"]
        assert "summary" in data
        assert data["files_processed"] == 1
        assert "added" in data["summary"]
        assert "skipped" in data["summary"]
