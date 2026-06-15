"""
Tests for the classifier service.
"""


import pytest
from unittest.mock import patch, MagicMock
from app.models.category_rules import CategoryRule
from app.services.classifier import match_rule_based_category, classify_description_with_ai


# ============================================================================
# 1. Tests for Rule-Based Category Matching
# ============================================================================

def test_match_rule_based_category_success():
    """Test that a keyword match successfully maps to the target category."""
    # Arrange: Mock CategoryRule instances to avoid running full database setups
    rule1 = MagicMock(spec=CategoryRule, keyword="Starbucks", target_category="Coffee Shops")
    rule2 = MagicMock(spec=CategoryRule, keyword="Netflix", target_category="Subscriptions")
    db_rules = [rule1, rule2]
    
    # Act & Assert: Exact and partial matches should pass
    assert match_rule_based_category("STARBUCKS LONDON", "", db_rules) == "Coffee Shops"
    assert match_rule_based_category("NETFLIX.COM DIGITAL", "", db_rules) == "Subscriptions"


def test_match_rule_based_category_case_insensitive():
    """Test that keyword matching ignores string casing completely."""
    rule = MagicMock(spec=CategoryRule, keyword="saInsBurYs", target_category="Groceries")
    
    assert match_rule_based_category("SAINSBURYS SUPERMARKET",  "", [rule]) == "Groceries"
    assert match_rule_based_category("sainsburys local",  "", [rule]) == "Groceries"


def test_match_rule_based_category_no_match():
    """Test that when no keywords match, the function returns None gracefully."""
    rule = MagicMock(spec=CategoryRule, keyword="TFL", target_category="Transport")
    
    assert match_rule_based_category("Unknown Vendor Payment",  "", [rule]) is None


def test_match_rule_based_category_empty_rules():
    """Test that an empty database rule list returns None."""
    assert match_rule_based_category("Any Description",  "", []) is None


# ============================================================================
# 2. Tests for Ollama AI Classification Fallback
# ============================================================================

def test_classify_description_with_ai_empty_categories():
    """Test that if no options are given, it short-circuits to Uncategorized."""
    assert classify_description_with_ai("Uber Trip", []) == "Uncategorized"


@patch("ollama.generate")
def test_classify_description_with_ai_success(mock_generate):
    """Test that a valid LLM string response matches an available category constraint."""
    # Arrange: Mock the dictionary response structure returned by the ollama library
    mock_generate.return_value = {"response": "  Groceries  "}  # Includes whitespace to test stripping
    available_categories = ["Groceries", "Transport", "Entertainment"]
    
    # Act
    result = classify_description_with_ai("Sainsburys Store 123", available_categories)
    
    # Assert
    assert result == "Groceries"
    mock_generate.assert_called_once()
    
    # Validate prompt contains core requirements
    called_prompt = mock_generate.call_args[1]["prompt"]
    assert "SigmaSpend" in called_prompt
    assert "Sainsburys Store 123" in called_prompt


@patch("ollama.generate")
def test_classify_description_with_ai_invalid_llm_response(mock_generate):
    """Test that if the LLM hallucinates an invalid category, it falls back to Uncategorized."""
    # Arrange: LLM returns a category name not present in the allowed list
    mock_generate.return_value = {"response": "Space Travel Expenses"}
    available_categories = ["Groceries", "Transport"]
    
    # Act
    result = classify_description_with_ai("Rocket Fuel Purchase", available_categories)
    
    # Assert
    assert result == "Uncategorized"


@patch("ollama.generate")
def test_classify_description_with_ai_daemon_unreachable(mock_generate):
    """Test that if the local Ollama service is offline, the exception is caught safely."""
    # Arrange: Force ollama.generate to raise a connection error
    mock_generate.side_effect = Exception("Connection refused by localhost:11434")
    available_categories = ["Groceries", "Transport"]
    
    # Act
    result = classify_description_with_ai("TFL Tube Journey", available_categories)
    
    # Assert
    # The application must not crash; it should catch the exception and return "Uncategorized"
    assert result == "Uncategorized"