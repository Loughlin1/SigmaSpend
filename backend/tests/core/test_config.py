"""
Tests for configuration management.
"""
import pytest
from app.core.config import settings


class TestSettings:
    """Test suite for application settings."""
    
    def test_settings_project_name(self):
        """Test project name setting."""
        assert settings.PROJECT_NAME == "SigmaSpend API"
    
    def test_settings_api_v1_str(self):
        """Test API v1 prefix setting."""
        assert settings.API_V1_STR == "/api/v1"
    
    def test_settings_database_url(self):
        """Test database URL is configured."""
        assert "sqlite" in settings.DATABASE_URL or "postgresql" in settings.DATABASE_URL
    
    def test_settings_are_strings(self):
        """Test that all settings are strings."""
        assert isinstance(settings.PROJECT_NAME, str)
        assert isinstance(settings.API_V1_STR, str)
        assert isinstance(settings.DATABASE_URL, str)
