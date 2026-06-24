"""
Tests for the /banks endpoint, which serves static bank profiles from banks.yaml.
"""
import pytest
from fastapi import status
from unittest.mock import patch
from pathlib import Path


class TestBanksEndpoints:
    """Test suite for the static banks configuration endpoint."""

    def test_list_banks_returns_200(self, client):
        """Test that the banks endpoint returns a successful response."""
        response = client.get("/api/v1/banks/")
        assert response.status_code == status.HTTP_200_OK

    def test_list_banks_returns_a_list(self, client):
        """Test that the response is a list."""
        response = client.get("/api/v1/banks/")
        assert isinstance(response.json(), list)

    def test_list_banks_not_empty(self, client):
        """Test that the real banks.yaml contains at least one entry."""
        response = client.get("/api/v1/banks/")
        assert len(response.json()) > 0

    def test_bank_profile_has_required_fields(self, client):
        """Test that each bank profile includes name and country."""
        response = client.get("/api/v1/banks/")
        for bank in response.json():
            assert "name" in bank
            assert "country" in bank

    def test_bank_profile_optional_fields_are_nullable(self, client):
        """Test that optional mapping fields can be null."""
        response = client.get("/api/v1/banks/")
        for bank in response.json():
            # These are Optional — must exist as keys but may be None
            assert "default_amount_style" in bank
            assert "default_invert_amounts" in bank
            assert "default_mappings" in bank

    def test_banks_all_have_gb_country(self, client):
        """Test that all banks in the config are tagged as GB banks."""
        response = client.get("/api/v1/banks/")
        for bank in response.json():
            assert bank["country"] == "GB"

    def test_monzo_has_default_mappings(self, client):
        """Test that Monzo (a known configured bank) has default mappings."""
        response = client.get("/api/v1/banks/")
        monzo = next((b for b in response.json() if b["name"] == "Monzo"), None)
        assert monzo is not None
        assert monzo["default_mappings"] is not None
        assert "date_column" in monzo["default_mappings"]

    def test_missing_config_file_returns_500(self, client):
        """Test that a missing banks.yaml results in a 500 error."""
        with patch(
            "app.api.endpoints.banks.BANKS_CONFIG_PATH",
            Path("/nonexistent/path/banks.yaml"),
        ):
            response = client.get("/api/v1/banks/")
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "missing" in response.json()["detail"].lower()
