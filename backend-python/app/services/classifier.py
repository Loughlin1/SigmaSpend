# app/services/classifier.py
import ollama
import re
from typing import List, Optional
from dateutil import parser
import logging

from app.models.category_rules import CategoryRule
from app.models.expense import Expense


def match_rule_based_category(expense_obj: Expense, db_rules: List[CategoryRule], logger: logging.Logger) -> str:
    """
    Evaluates incoming statement line parameters against registered rules.
    Checks either the raw description string or notes field context dynamically.
    """
    if not db_rules:
        logger.warning("[classifier] No category rules found. Categorizing as 'Uncategorized'.")
        return "Uncategorized"

    for match_field in ["description", "notes"]:
        rule_map = {
            rule.keyword.lower(): str(rule.category.name)
            for rule in db_rules 
            if rule.match_field.lower() == match_field
        }
        # If no rules exist for this specific column, skip compiling to avoid r"\b()\b" crashes
        if not rule_map:
            continue
        # Escape keywords and join them into a single regex: \b(starbucks|netflix|uber)\b
        # Word boundaries (\b) ensure "Uber" doesn't accidentally match "PubErnie"
        pattern_str = r"\b(" + "|".join(re.escape(k) for k in rule_map.keys()) + r")\b"
        compiled_pattern = re.compile(pattern_str, re.IGNORECASE)
        
        target_text = getattr(expense_obj, match_field, "")
        if not target_text:
            continue

        match = compiled_pattern.search(target_text)
        if match:
            matched_keyword = match.group(1).lower()
            # Safely return the category mapping assigned to that keyword token
            if matched_keyword in rule_map:
                logger.info(f"[classifier] Rule match successful: Found keyword '{matched_keyword}' in field '{match_field}'.")
                return rule_map[matched_keyword]

    return "Uncategorized"


def classify_description_with_ai(description: str, available_categories: List[str]) -> str:
    """
    Calls a local Ollama daemon container using a zero-shot financial prompt framework.
    """
    if not available_categories:
        return "Uncategorized"
        
    categories_str = ", ".join(available_categories)
    prompt = f"""
    You are the core categorisation utility for the financial software SigmaSpend.
    Your task is to classify a bank transaction description into EXACTLY ONE of these available categories:
    [{categories_str}]

    Transaction Description to classify: "{description}"

    Rules:
    - Respond with ONLY the exact category name from the list.
    - Do not include explanations, punctuation, or wrapper markdown blocks.
    - If you are completely unsure, respond with exactly "Uncategorized".
    """

    try:
        response = ollama.generate(
            model='llama3', # Or 'llama3.1' / 'mistral'
            prompt=prompt,
            options={
                'temperature': 0.0, # Zeroed variance ensures deterministic outputs
                'top_p': 0.1
            }
        )
        assigned_category = response['response'].strip()
        
        if assigned_category in available_categories:
            return assigned_category
            
    except Exception as e:
        # Fall back gracefully to avoid halting file processing if the Ollama daemon isn't running
        print(f"Ollama hook inactive or unreachable: {e}")
        
    return "Uncategorized"