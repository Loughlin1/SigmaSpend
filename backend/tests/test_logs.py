"""Tests for the logs API endpoints."""
import json
import os
import tempfile
from unittest.mock import patch

import pytest
from fastapi import status


# Sample log entries as JSON-lines strings
SAMPLE_ENTRIES = [
    {"timestamp": "2024-01-15T10:00:00+00:00", "level": "INFO", "module": "sigmaspend.api", "message": "Request received"},
    {"timestamp": "2024-01-15T10:01:00+00:00", "level": "ERROR", "module": "sigmaspend.db", "message": "Connection failed"},
    {"timestamp": "2024-01-15T10:02:00+00:00", "level": "DEBUG", "module": "sigmaspend.api", "message": "Query executed"},
]


def _make_log_file(entries: list) -> str:
    """Write entries as JSON-lines to a temp file and return the path."""
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".log", delete=False)
    for e in entries:
        tmp.write(json.dumps(e) + "\n")
    tmp.close()
    return tmp.name


class TestLogsEndpoints:
    """Test suite for the logs API endpoints."""

    def test_get_logs_returns_entries(self, client):
        """GET /logs returns entries from the log file."""
        log_file = _make_log_file(SAMPLE_ENTRIES)
        try:
            with patch("app.api.endpoints.logs.get_log_file", return_value=log_file):
                response = client.get("/api/v1/logs")
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "entries" in data
            assert "total" in data
            assert data["total"] == len(SAMPLE_ENTRIES)
        finally:
            os.unlink(log_file)

    def test_get_logs_filter_by_level(self, client):
        """GET /logs?level=ERROR returns only ERROR-level entries."""
        log_file = _make_log_file(SAMPLE_ENTRIES)
        try:
            with patch("app.api.endpoints.logs.get_log_file", return_value=log_file):
                response = client.get("/api/v1/logs?level=ERROR")
            data = response.json()
            assert data["total"] == 1
            assert data["entries"][0]["level"] == "ERROR"
        finally:
            os.unlink(log_file)

    def test_get_logs_filter_by_module(self, client):
        """GET /logs?module=db returns only entries whose module contains 'db'."""
        log_file = _make_log_file(SAMPLE_ENTRIES)
        try:
            with patch("app.api.endpoints.logs.get_log_file", return_value=log_file):
                response = client.get("/api/v1/logs?module=db")
            data = response.json()
            assert data["total"] == 1
            assert "db" in data["entries"][0]["module"]
        finally:
            os.unlink(log_file)

    def test_get_logs_limit(self, client):
        """GET /logs?limit=1 returns at most one entry."""
        log_file = _make_log_file(SAMPLE_ENTRIES)
        try:
            with patch("app.api.endpoints.logs.get_log_file", return_value=log_file):
                response = client.get("/api/v1/logs?limit=1")
            data = response.json()
            assert len(data["entries"]) == 1
        finally:
            os.unlink(log_file)

    def test_get_logs_returns_empty_when_file_missing(self, client):
        """GET /logs with a non-existent log file returns 0 entries."""
        with patch("app.api.endpoints.logs.get_log_file", return_value="/nonexistent/path/app.log"):
            response = client.get("/api/v1/logs")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["total"] == 0

    def test_get_logs_includes_filters_in_response(self, client):
        """GET /logs response includes the applied filters."""
        log_file = _make_log_file(SAMPLE_ENTRIES)
        try:
            with patch("app.api.endpoints.logs.get_log_file", return_value=log_file):
                response = client.get("/api/v1/logs?level=INFO&limit=10")
            data = response.json()
            assert data["filters"]["level"] == "INFO"
            assert data["filters"]["limit"] == 10
        finally:
            os.unlink(log_file)

    def test_get_log_levels(self, client):
        """GET /logs/levels returns the expected set of level names."""
        response = client.get("/api/v1/logs/levels")
        assert response.status_code == status.HTTP_200_OK
        levels = response.json()["levels"]
        assert "INFO" in levels
        assert "ERROR" in levels
        assert "DEBUG" in levels
        assert "WARNING" in levels
        assert "CRITICAL" in levels

    def test_get_log_modules(self, client):
        """GET /logs/modules returns distinct modules from the log file."""
        log_file = _make_log_file(SAMPLE_ENTRIES)
        try:
            with patch("app.api.endpoints.logs.get_log_file", return_value=log_file):
                response = client.get("/api/v1/logs/modules")
            assert response.status_code == status.HTTP_200_OK
            modules = response.json()["modules"]
            assert "sigmaspend.api" in modules
            assert "sigmaspend.db" in modules
        finally:
            os.unlink(log_file)

    def test_get_log_modules_empty_when_no_log_file(self, client):
        """GET /logs/modules returns empty list when log file is missing."""
        with patch("app.api.endpoints.logs.get_log_file", return_value="/nonexistent/path/app.log"):
            response = client.get("/api/v1/logs/modules")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["modules"] == []
