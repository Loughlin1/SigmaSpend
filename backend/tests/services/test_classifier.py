"""
Tests for the classifier service.
"""
import logging
import pytest
from unittest.mock import patch, MagicMock
from app.models.category_rules import CategoryRule
from app.models.expense import Expense
from app.services.ingestion.classifier import match_rule_based_category, classify_description_with_ai

logger = logging.getLogger("sigmaspend_test")


def _make_expense(description: str, notes: str = "") -> Expense:
    """Build a minimal Expense object for classifier tests without touching the DB."""
    exp = MagicMock(spec=Expense)
    exp.description = description
    exp.notes = notes
    return exp


def _make_rule(keyword: str, category_name: str, match_field: str = "description") -> CategoryRule:
    """Build a mock CategoryRule with the nested category.name relationship."""
    rule = MagicMock(spec=CategoryRule)
    rule.keyword = keyword
    rule.match_field = match_field
    rule.category = MagicMock()
    rule.category.name = category_name
    return rule


# ============================================================================
# 1. Tests for Rule-Based Category Matching
# ============================================================================

def test_match_rule_based_category_success():
    """Test that a keyword match successfully maps to the correct category."""
    rules = [
        _make_rule("starbucks", "Coffee Shops"),
        _make_rule("netflix", "Subscriptions"),
    ]
    assert match_rule_based_category(_make_expense("STARBUCKS LONDON"), rules, logger) == "Coffee Shops"
    assert match_rule_based_category(_make_expense("NETFLIX.COM DIGITAL"), rules, logger) == "Subscriptions"


def test_match_rule_based_category_case_insensitive():
    """Test that keyword matching ignores casing."""
    rules = [_make_rule("sainsburys", "Groceries")]
    assert match_rule_based_category(_make_expense("SAINSBURYS SUPERMARKET"), rules, logger) == "Groceries"
    assert match_rule_based_category(_make_expense("sainsburys local"), rules, logger) == "Groceries"


def test_match_rule_based_category_no_match():
    """Test that when no keywords match, 'Uncategorized' is returned."""
    rules = [_make_rule("tfl", "Transport")]
    result = match_rule_based_category(_make_expense("Unknown Vendor Payment"), rules, logger)
    assert result == "Uncategorized"


def test_match_rule_based_category_empty_rules():
    """Test that an empty rules list returns 'Uncategorized'."""
    result = match_rule_based_category(_make_expense("Any Description"), [], logger)
    assert result == "Uncategorized"


def test_match_rule_based_category_notes_field():
    """Test that rules matching on 'notes' field work correctly."""
    rules = [_make_rule("receipt", "Expenses", match_field="notes")]
    expense = _make_expense("Amazon Purchase", notes="receipt confirmed")
    assert match_rule_based_category(expense, rules, logger) == "Expenses"


# ============================================================================
# 2. Tests for Ollama AI Classification Fallback
# ============================================================================

def test_classify_description_with_ai_empty_categories():
    """Test that if no categories are available, it returns Uncategorized."""
    assert classify_description_with_ai("Uber Trip", []) == "Uncategorized"


@patch("ollama.generate")
def test_classify_description_with_ai_success(mock_generate):
    """Test that a valid LLM response matching an available category is returned."""
    mock_generate.return_value = {"response": "  Groceries  "}
    available_categories = ["Groceries", "Transport", "Entertainment"]

    result = classify_description_with_ai("Sainsburys Store 123", available_categories)

    assert result == "Groceries"
    mock_generate.assert_called_once()
    called_prompt = mock_generate.call_args[1]["prompt"]
    assert "SigmaSpend" in called_prompt
    assert "Sainsburys Store 123" in called_prompt


@patch("ollama.generate")
def test_classify_description_with_ai_invalid_llm_response(mock_generate):
    """Test that a hallucinated category not in the list falls back to Uncategorized."""
    mock_generate.return_value = {"response": "Space Travel Expenses"}
    result = classify_description_with_ai("Rocket Fuel", ["Groceries", "Transport"])
    assert result == "Uncategorized"


@patch("ollama.generate")
def test_classify_description_with_ai_daemon_unreachable(mock_generate):
    """Test that an Ollama connection error is caught and returns Uncategorized."""
    mock_generate.side_effect = Exception("Connection refused by localhost:11434")
    result = classify_description_with_ai("TFL Tube Journey", ["Groceries", "Transport"])
    assert result == "Uncategorized"
