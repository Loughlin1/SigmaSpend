# app/services/parser.py
import csv
import hashlib
from io import StringIO
from collections import defaultdict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from dateutil import parser as date_parser
from typing import List, Dict, Any, Tuple, Optional

from app.models.expense import Expense
from app.models.bank_account import BankAccount
from app.services.ingestion.classifier import match_rule_based_category, classify_description_with_ai
from app.models.category_rules import CategoryRule
from app.models.category import Category

import logging
logger = logging.getLogger("sigmaspend")


class StatementParserService:
    @classmethod
    def get_account_bank_config(cls, db: Session, account_id: int) -> dict:
        account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
        if not account:
            logger.error(f"[parser] Ingestion lookup failed: Account '{account_id}' does not exist.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bank account '{account_id}' not found. Create it first via POST /accounts"
            )

        if account.mappings is not None:
            return {
                "account_id": account.id,
                "amount_style": account.amount_style or "single_column",
                "mappings": account.mappings,
                "invert_amounts": account.invert_amounts,
            }

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bank configuration for account '{account_id}' is missing."
        )
    
    @staticmethod
    def generate_transaction_hash(
        account_id: int, date: str, amount: float, is_income: bool, description: str, occurrence: int
    ) -> str:
        normalized_desc = description.strip().lower()
        base_signature = f"{account_id}_{date}_{amount}_{is_income}_{normalized_desc}_occ{occurrence}"
        return hashlib.md5(base_signature.encode("utf-8")).hexdigest()

    @classmethod
    def _get_category_cache(cls, db: Session) -> Tuple[List[str], Dict[str, Any]]:
        """Extracts and builds the in-memory lookup cache maps from the database."""
        flat_categories = []
        category_map = {}
        db_categories = db.query(Category).all()

        for cat in db_categories:
            category_map[cat.name.lower()] = cat
            flat_categories.append(cat.name)
            
            if cat.subcategories:
                for sub in cat.subcategories:
                    # Fixing the type collision bug found in your original inner loop
                    sub_name = sub if isinstance(sub, str) else sub.name
                    category_map[sub_name.lower()] = sub
                    flat_categories.append(sub_name)

        return list(set(flat_categories)), category_map

    @staticmethod
    def _parse_amount(row: Dict[str, str], amount_style: str, invert_amounts: bool, mappings: Dict[str, str]) -> Tuple[float, bool]:
        """Handles parsing monetary amounts and determining direction (Income vs Outflow)."""
        amount = 0.0
        is_income = False

        if amount_style == "single_column":
            raw_amount = float(row[mappings["amount_column"]].replace(",", ""))
            if raw_amount >= 0:
                amount = raw_amount
                is_income = True
            else:
                amount = abs(raw_amount)
                is_income = False
                
        elif amount_style == "split_columns":
            raw_out = row.get(mappings["amount_out_column"], "").strip().replace(",", "")
            raw_in = row.get(mappings["amount_in_column"], "").strip().replace(",", "")
            
            if raw_out and float(raw_out) > 0:
                amount = float(raw_out)
                is_income = False
            elif raw_in and float(raw_in) > 0:
                amount = float(raw_in)
                is_income = True
            else:
                raise ValueError("Row contains no valid numeric values in split columns.")
        
        # Credit card statement handling
        if invert_amounts:
            is_income = not is_income        
        
        return amount, is_income

    @staticmethod
    def _assign_category(expense: Expense, all_rules: List[Any], category_map: Dict[str, Any]) -> Optional[int]:
        """Runs transaction routing against Rule Engine and links its integer Category ID."""
        assigned_cat = match_rule_based_category(expense, all_rules, logger)
        
        # Unmuted/prepared for when local Ollama AI block is enabled
        # if not assigned_cat or assigned_cat.strip().lower() == "uncategorized":
        #     assigned_cat = classify_description_with_ai(expense.description, list(category_map.keys()))

        if assigned_cat and assigned_cat.strip().lower() != "uncategorized":
            lookup_key = assigned_cat.strip().lower()
            if lookup_key in category_map:
                return category_map[lookup_key].id
            else:
                logger.warning(f"[parser] Category label '{assigned_cat}' not recognized in backend schema configurations.")
        return None

    @classmethod
    def process_csv(cls, file_contents: str, db: Session, account_id: int) -> dict:
        if account_id is None:
            logger.warning("[parser] Aborting CSV processing: No account_id provided to execution thread.")
            return {}

        bank_config = cls.get_account_bank_config(db, account_id)
        amount_style = bank_config.get("amount_style", "single_column")
        mappings = bank_config["mappings"]
        invert_amounts = bank_config["invert_amounts"]
        
        logger.info(f"[parser] Starting CSV ingestion pipeline for account: '{account_id}' (Format: {amount_style}, invert_amounts: {invert_amounts})")

        all_rules = db.query(CategoryRule).all()
        flat_categories, category_map = cls._get_category_cache(db)
    
        csv_file = StringIO(file_contents.lstrip('﻿'))
        reader = csv.DictReader(csv_file)
        headers = reader.fieldnames or []
        if mappings["date_column"] not in headers or mappings["description_column"] not in headers:
            logger.error(f"[parser] Ingestion aborted. Configured mappings do not match CSV headers: {headers}")
            return {"added": 0, "skipped": 0, "errors": len(file_contents.splitlines())}

        # Tracking metrics
        file_combinations = defaultdict(int)
        added_count = 0
        skipped_count = 0
        error_count = 0
        # Categorization performance metrics
        categorized_count = 0
        uncategorized_count = 0

        for row_num, row in enumerate(reader, start=1):
            try:
                # Row Filter Clause Guard
                if "filter_column" in bank_config and "filter_value" in bank_config:
                    if row.get(mappings["filter_column"], "").strip() != str(bank_config["filter_value"]):
                        continue

                # Extract Baseline Properties
                raw_date = row[mappings["date_column"]].strip()
                description = row[mappings["description_column"]].strip()
                parsed_date = date_parser.parse(raw_date, dayfirst=True).date()
                
                notes_key = mappings.get("notes_column")
                notes = row.get(notes_key, "").strip() if notes_key else ""

                amount, is_income = cls._parse_amount(row, amount_style, invert_amounts, mappings)

                # Deduplication Strategy Evaluation
                # Determine its specific sequential position in the CURRENT file
                base_sig = f"{account_id}_{raw_date}_{amount}_{is_income}_{description.lower()}"
                file_combinations[base_sig] += 1
                occurrence = file_combinations[base_sig] # ◄ Track sequentially starting at 1, 2, etc.

                tx_hash = cls.generate_transaction_hash(
                    account_id=account_id, date=raw_date, amount=amount,
                    is_income=is_income, description=description, occurrence=occurrence
                )
                
                # Deduplication Check
                if db.query(Expense).filter(Expense.transaction_hash == tx_hash).first():
                    skipped_count += 1
                    logger.debug(f"[parser] Row #{row_num} skipped: Hash collision caught via Deduplication Engine.")
                    continue

                # Instatiate a transient Expense object BEFORE categorisation
                new_expense = Expense(
                    account_id=account_id,
                    date=parsed_date,
                    amount=amount,
                    is_income=is_income,
                    description=description,
                    notes=notes,
                    transaction_hash=tx_hash,
                    category_id=None
                )

                # Rule Engine & AI Category Assignment
                cat_id = cls._assign_category(new_expense, all_rules, category_map)
                new_expense.category_id = cat_id # type: ignore
                if cat_id:
                    categorized_count += 1
                else:
                    uncategorized_count += 1

                db.add(new_expense)
                added_count += 1

            except Exception as row_error:
                error_count += 1
                logger.warning(f"[parser] Skipped row #{row_num} due to formatting exception: {str(row_error)}")
                continue

        db.commit()
        logger.info(
            f"[parser] Successfully parsed CSV file into database"
            f"Ingestion Summary -> Added: {added_count} | Skipped: {skipped_count} | Errors: {error_count} || "
            f"Classification Breakdown -> Successfully Categorised: {categorized_count} | Left Uncategorised: {uncategorized_count}"
        )
        return {
            "added": added_count, 
            "skipped": skipped_count,
            "categorized": categorized_count,
            "uncategorized": uncategorized_count
        }