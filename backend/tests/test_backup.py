"""Tests for the backup API endpoints."""
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi import status


class TestBackupEndpoints:
    """Test suite for the backup API endpoints."""

    def test_trigger_backup_success(self, client):
        """POST /backup/trigger creates a backup and returns path info."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fake_db = os.path.join(tmpdir, "test_db.db")
            # Create an empty SQLite file to back up
            open(fake_db, "wb").close()
            fake_url = f"sqlite:///{fake_db}"

            with patch("app.api.endpoints.backup.settings") as mock_settings, \
                 patch("app.api.endpoints.backup.run_backup") as mock_run:
                mock_settings.DATABASE_URL = fake_url
                mock_run.return_value = os.path.join(tmpdir, "backups", "test_db_backup_20240101_020000.db")

                response = client.post("/api/v1/backup/trigger")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "message" in data
        assert "Backup created" in data["message"]
        assert "path" in data

    def test_trigger_backup_calls_run_backup_with_db_url(self, client):
        """POST /backup/trigger passes DATABASE_URL to run_backup."""
        with patch("app.api.endpoints.backup.settings") as mock_settings, \
             patch("app.api.endpoints.backup.run_backup") as mock_run:
            mock_settings.DATABASE_URL = "sqlite:///./some.db"
            mock_run.return_value = "/some/path/some_backup.db"

            client.post("/api/v1/backup/trigger")

        mock_run.assert_called_once_with("sqlite:///./some.db")

    def test_list_backups_empty(self, client):
        """GET /backup/list returns empty list when no backups exist."""
        with patch("app.api.endpoints.backup.settings") as mock_settings, \
             patch("app.api.endpoints.backup.list_backups") as mock_list:
            mock_settings.DATABASE_URL = "sqlite:///./some.db"
            mock_list.return_value = []

            response = client.get("/api/v1/backup/list")

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_list_backups_returns_metadata(self, client):
        """GET /backup/list returns file metadata for each backup."""
        fake_backups = [
            {
                "filename": "db_backup_20240101_020000.db",
                "path": "/data/backups/db_backup_20240101_020000.db",
                "size_kb": 128.4,
                "created_at": "2024-01-01T02:00:00",
            },
            {
                "filename": "db_backup_20231231_020000.db",
                "path": "/data/backups/db_backup_20231231_020000.db",
                "size_kb": 120.0,
                "created_at": "2023-12-31T02:00:00",
            },
        ]

        with patch("app.api.endpoints.backup.settings") as mock_settings, \
             patch("app.api.endpoints.backup.list_backups") as mock_list:
            mock_settings.DATABASE_URL = "sqlite:///./some.db"
            mock_list.return_value = fake_backups

            response = client.get("/api/v1/backup/list")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
        assert data[0]["filename"] == "db_backup_20240101_020000.db"
        assert data[0]["size_kb"] == 128.4
        assert data[1]["filename"] == "db_backup_20231231_020000.db"
