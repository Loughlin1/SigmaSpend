# app/services/classifier.py
import ollama
from typing import List, Optional
from dateutil import parser
from app.models.category_rules import CategoryRule

def match_rule_based_category(description: str, db_rules: List[CategoryRule]) -> Optional[str]:
    """
    Scans a line description against explicit text keywords. (Fast & Local)
    """
    desc_lower = description.lower()
    for rule in db_rules:
        if rule.keyword.lower() in desc_lower:
            return rule.target_category
    return None

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