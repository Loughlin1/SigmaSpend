"""
Tests for the shared utility functions (parse_uk_date).
"""
import logging
import datetime
import pytest
from app.exceptions import InvalidDateError
from app.services.utilities import parse_uk_date

logger = logging.getLogger("sigmaspend_test")


class TestParseUkDate:
    """Unit tests for the parse_uk_date helper."""

    def test_returns_none_for_none_input(self):
        assert parse_uk_date(None, logger) is None

    def test_returns_none_for_empty_string(self):
        assert parse_uk_date("", logger) is None

    def test_returns_date_object_unchanged(self):
        d = datetime.date(2024, 6, 15)
        assert parse_uk_date(d, logger) is d

    def test_parses_iso_format(self):
        result = parse_uk_date("2024-06-15", logger)
        assert result == datetime.date(2024, 6, 15)

    def test_parses_dd_mm_yyyy_slash(self):
        """UK-format dates should be interpreted as DD/MM/YYYY (dayfirst=True)."""
        result = parse_uk_date("15/06/2024", logger)
        assert result == datetime.date(2024, 6, 15)

    def test_parses_dd_mm_yyyy_dash(self):
        result = parse_uk_date("15-06-2024", logger)
        assert result == datetime.date(2024, 6, 15)

    def test_parses_ambiguous_date_as_day_first(self):
        """01/02/2024 should be 1 Feb, not 2 Jan (dayfirst=True)."""
        result = parse_uk_date("01/02/2024", logger)
        assert result == datetime.date(2024, 2, 1)

    def test_raises_invalid_date_error_for_garbage_input(self):
        with pytest.raises(InvalidDateError) as exc:
            parse_uk_date("not-a-date", logger)
        assert "Invalid date format" in exc.value.detail

    def test_raises_invalid_date_error_for_partial_date(self):
        with pytest.raises(InvalidDateError):
            parse_uk_date("2024-99-99", logger)

    def test_error_detail_includes_original_input(self):
        bad_value = "32/13/2024"
        with pytest.raises(InvalidDateError) as exc:
            parse_uk_date(bad_value, logger)
        assert bad_value in exc.value.detail
