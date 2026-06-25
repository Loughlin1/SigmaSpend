# tests/services/test_pdf_parser.py
import io
import pytest
import logging
from unittest.mock import MagicMock, patch
from datetime import date, datetime
from fastapi import HTTPException

from app.services.pdf_parser import PDFStatementParser
from app.models.expense import Expense
from app.models.category_rules import CategoryRule

# Setup a clean logger instance for tests
logger = logging.getLogger("sigmaspend_test")


# ============================================================================
# 1. Tests for _normalize_date
# ============================================================================

def test_normalize_date_standard_yearless():
    """Should correctly combine day/month with provided statement year context."""
    res = PDFStatementParser._normalize_date("01 FEBRUARY", [2025])
    assert res == date(2025, 2, 1)


def test_normalize_date_crossover_december():
    """Multi-year statement context: Dec row should bind to the earlier year."""
    res = PDFStatementParser._normalize_date("29 DECEMBER", [2025, 2026])
    assert res == date(2025, 12, 29)


def test_normalize_date_crossover_january():
    """Multi-year statement context: Jan row should bind to the later year."""
    res = PDFStatementParser._normalize_date("02 JANUARY", [2025, 2026])
    assert res == date(2026, 1, 2)


def test_normalize_date_fallback_formats():
    """Should resolve explicit full date string variants gracefully."""
    res_slash = PDFStatementParser._normalize_date("15/06/2024", [2025])
    assert res_slash == date(2024, 6, 15)

    res_dash = PDFStatementParser._normalize_date("20-11-2023", [2025])
    assert res_dash == date(2023, 11, 20)


def test_normalize_date_invalid_raises():
    """Should raise ValueError when date structure cannot be parsed."""
    with pytest.raises(ValueError, match="Unsupported string spatial date layout format"):
        PDFStatementParser._normalize_date("INVALID_DATE_TEXT", [2025])


# ============================================================================
# 2. Tests for _extract_statement_years
# ============================================================================

@patch("app.services.pdf_parser.pdfplumber.open")
def test_extract_statement_years_success(mock_pdf_open):
    """Should extract, validate, and deduplicate years from page text block."""
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Statement Period: 01 Jan 2022 to 31 Dec 2022. Archive 2015, Type 2035."
    
    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_pdf_open.return_value.__enter__.return_value = mock_pdf

    res = PDFStatementParser._extract_statement_years(io.BytesIO(b"dummy"), logger)
    assert res == [2022]


@patch("app.services.pdf_parser.pdfplumber.open")
def test_extract_statement_years_fallback(mock_pdf_open):
    """Should fall back onto the current year if no valid matching text exists."""
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "No years present in this sentence profile string."
    
    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_pdf_open.return_value.__enter__.return_value = mock_pdf

    res = PDFStatementParser._extract_statement_years(io.BytesIO(b"dummy"), logger)
    assert res == [datetime.now().year]


# ============================================================================
# 3. Tests for parse_and_ingest Main Pipeline
# ============================================================================

@patch("app.services.pdf_parser.StatementParserService")
def test_parse_and_ingest_missing_regex_raises(mock_parser_service):
    """Guard clause test: Should abort with a 400 error if account lacks custom configuration settings."""
    mock_db = MagicMock()
    mock_parser_service.get_account_bank_config.return_value = {
        "mappings": {}  
    }

    with pytest.raises(HTTPException) as exc_info:
        PDFStatementParser.parse_and_ingest(io.BytesIO(b"dummy"), mock_db, account_id=1, logger=logger)

    assert exc_info.value.status_code == 400
    assert "PDF parsing rules are missing for this account" in exc_info.value.detail


def test_parse_and_ingest_successful_flow():
    """Should parse spatial layout coordinates, map rules, verify duplicates, and save records successfully."""
    mock_db = MagicMock()

    # 1. Chained query mock setup for database pipeline executions
    mock_query = MagicMock()
    mock_query.all.return_value = []
    
    mock_filter_result = MagicMock()
    mock_filter_result.first.return_value = None
    mock_query.filter.return_value = mock_filter_result
    
    mock_db.query.return_value = mock_query

    # Construct Mocked Word Layout Tokens sharing an identical row-top baseline
    words_data = [
        {"text": "12",        "top": 10.2, "x0": 10},
        {"text": "FEBRUARY",  "top": 10.2, "x0": 25},
        {"text": "",          "top": 10.2, "x0": 60},   # spacer: date→description column gap
        {"text": "STARBUCKS", "top": 10.2, "x0": 80},
        {"text": "COFFEE",    "top": 10.2, "x0": 150},
        {"text": "",          "top": 10.2, "x0": 200},  # spacer: description→amount column gap
        {"text": "4.50",      "top": 10.2, "x0": 240},
    ]
    
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Statement Context Header Year: 2025"
    mock_page.extract_words.return_value = words_data
    
    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]

    # Explicit inline patches guarantee perfect object mapping assignment
    with patch("app.services.pdf_parser.StatementParserService") as mock_parser_service, \
         patch("app.services.pdf_parser.pdfplumber.open") as mock_pdf_open, \
         patch("app.services.pdf_parser.object_mapper") as mock_object_mapper:

        # Setup Account Mapping Profile Configuration
        mock_parser_service.get_account_bank_config.return_value = {
            "mappings": {
                # "pdf_regex": r"^(\d{2}\s+[A-Z]+)\s+(.+?)\s+(-?[\d,]+\.\d{2}(?:CR)?)$",
                "pdf_regex": r"^(\d{2}\s+[A-Z]{3,10})(?:\s+\d{2}\s+[A-Z]{3,10})?\s{2,}(.+?)\s{2,}(-?£?[0-9,]+\.\d{2}\s*(?:CR|DR)?)$",
                "pdf_header_bypass": "date of transaction,page"
            }
        }
        mock_parser_service._get_category_cache.return_value = ([], {})
        mock_parser_service.generate_transaction_hash.return_value = "unique_mocked_md5_hash_string"
        mock_parser_service._assign_category.return_value = 10  

        # Setup object_mapper mock columns properties
        mock_column = MagicMock()
        mock_column.key = "date"
        mock_mapper_instance = MagicMock()
        mock_mapper_instance.columns = [mock_column]
        mock_object_mapper.return_value = mock_mapper_instance

        mock_pdf_open.return_value.__enter__.return_value = mock_pdf

        # Execute Service Method
        metrics = PDFStatementParser.parse_and_ingest(io.BytesIO(b"dummy"), mock_db, account_id=1, logger=logger)
    
    # 🔍 ADD DIAGNOSTIC PRINTS TO INSPECT MOCK CALLS:
    print("\n--- 📊 DB QUERY MOCK CALL HISTORY ---")
    for idx, call in enumerate(mock_db.query.call_args_list, start=1):
        # call[0][0] extracts the first positional argument passed to db.query() (e.g., Expense or CategoryRule)
        model_queried = call[0][0]
        print(f"Query #{idx}: Invoked with Model Class -> {model_queried.__name__}")
    print("-------------------------------------\n")

    # Assert Ingestion Tracking Metric Aggregations
    assert metrics["added"] == 1
    assert metrics["skipped"] == 0
    assert metrics["categorized"] == 1
    assert metrics["uncategorized"] == 0

    # Verify Database Pipeline Assertions
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()


@patch("app.services.pdf_parser.pdfplumber.open")
@patch("app.services.pdf_parser.StatementParserService")
def test_parse_and_ingest_skips_duplicates(mock_parser_service, mock_pdf_open):
    """Duplicate Check: Should identify record hashes already present in DB and skip addition."""
    mock_db = MagicMock()
    
    mock_parser_service.get_account_bank_config.return_value = {
        "mappings": {
            "pdf_regex": r"^(\d{2}\s+[A-Z]+)\s+(.+?)\s+(-?[\d\.]+)$",
        }
    }
    mock_parser_service._get_category_cache.return_value = ([], {})
    mock_parser_service.generate_transaction_hash.return_value = "duplicate_hash"
    
    # Mock database collision discovery (Return an existing record -> Duplicate)
    mock_db.query.return_value.filter.return_value.first.return_value = Expense(id=99)

    words_data = [
        {"text": "15", "top": 12.0, "x0": 10},
        {"text": "MARCH", "top": 12.0, "x0": 30},
        {"text": "NETFLIX", "top": 12.0, "x0": 90},
        {"text": "10.99", "top": 12.0, "x0": 200},
    ]
    
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "2025"
    mock_page.extract_words.return_value = words_data
    
    mock_pdf = MagicMock()
    mock_pdf.pages = [mock_page]
    mock_pdf_open.return_value.__enter__.return_value = mock_pdf

    metrics = PDFStatementParser.parse_and_ingest(io.BytesIO(b"dummy"), mock_db, account_id=1, logger=logger)

    # Assert skipped calculation adjustments
    assert metrics["added"] == 0
    assert metrics["skipped"] == 1
    mock_db.add.assert_not_called()