# app/services/parser.py
import csv
import hashlib
from io import StringIO
from collections import defaultdict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from dateutil import parser as date_parser

from app.models.expense import Expense
from app.models.bank_account import BankAccount
from app.services.classifier import match_rule_based_category, classify_description_with_ai
from app.models.category_rules import CategoryRule
from app.models.category import Category

import logging
logger = logging.getLogger("sigmaspend")


class StatementParserService:
    @classmethod
    def get_account_bank_config(cls, db: Session, account_id: str, bank_profile: str = None) -> dict:
        account = db.query(BankAccount).filter(BankAccount.account_id == account_id).first()
        if not account:
            logger.error(f"Ingestion lookup failed: Account '{account_id}' does not exist.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bank account '{account_id}' not found. Create it first via POST /accounts"
            )

        if account.mappings:
            return {
                "account_id": account.account_id,
                "amount_style": account.amount_style or "single_column",
                "mappings": account.mappings,
            }

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bank configuration for account '{account_id}' is missing."
        )

    @staticmethod
    def generate_transaction_hash(
        account_id: str, date: str, amount: float, is_income: bool, description: str, occurrence: int
    ) -> str:
        normalized_desc = description.strip().lower()
        base_signature = f"{account_id}_{date}_{amount}_{is_income}_{normalized_desc}_occ{occurrence}"
        return hashlib.md5(base_signature.encode("utf-8")).hexdigest()

    @classmethod
    def process_csv(cls, file_contents: str, db: Session, account_id: str = None, bank_profile: str = None) -> dict:
        if not account_id:
            logger.warning("Aborting CSV processing: No account_id provided to execution thread.")
            return {}

        bank_config = cls.get_account_bank_config(db, account_id, bank_profile)
        amount_style = bank_config.get("amount_style", "single_column")
        mappings = bank_config["mappings"]
        
        logger.info(f"Starting CSV ingestion pipeline for account: '{account_id}' (Format: {amount_style})")

        all_rules = db.query(CategoryRule).all()
        
        # Flatten categories cache safely
        flat_categories = []
        db_categories = db.query(Category).all()
        for cat in db_categories:
            flat_categories.append(cat.name)
            for sub in cat.subcategories:
                # Handle both string arrays and object array mappings cleanly
                flat_categories.append(sub if isinstance(sub, str) else sub.name)
        flat_categories = list(set(flat_categories))

        csv_file = StringIO(file_contents)
        reader = csv.DictReader(csv_file)
        
        # Check if basic columns exist before iterating to catch configuration bugs fast
        headers = reader.fieldnames or []
        if mappings["date_column"] not in headers or mappings["description_column"] not in headers:
            logger.error(f"Ingestion aborted. Configured mappings do not match CSV headers: {headers}")
            return {"added": 0, "skipped": 0, "errors": len(file_contents.splitlines())}

        # Track file-local repetitions within this specific upload stream
        file_combinations = defaultdict(int)
        
        added_count = 0
        skipped_count = 0
        error_count = 0

        for row_num, row in enumerate(reader, start=1):
            try:
                # 1. Row Filter Clause Guard
                if "filter_column" in bank_config and "filter_value" in bank_config:
                    file_val = row.get(mappings["filter_column"], "").strip()
                    if file_val != str(bank_config["filter_value"]):
                        continue

                # 2. Extract Baseline Properties Safely
                raw_date = row[mappings["date_column"]].strip()
                description = row[mappings["description_column"]].strip()
                parsed_date = date_parser.parse(raw_date, dayfirst=True).date()
                
                # FIX: Use .get() to prevent KeyError if a file or mapping doesn't have notes
                notes_key = mappings.get("notes_column")
                notes = row.get(notes_key, "").strip() if notes_key else ""

                amount = 0.0
                is_income = False

                # 3. Process Monetary Columns
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
                        continue

                # 4. Accurate Cross-File Occurrence Calculation
                # Query the database to find how many matching entries already exist historically
                db_existing_count = db.query(Expense).filter(
                    Expense.account_id == account_id,
                    Expense.date == parsed_date,
                    Expense.amount == amount,
                    Expense.is_income == is_income,
                    Expense.description == description
                ).count()

                base_sig = f"{account_id}_{raw_date}_{amount}_{is_income}_{description.lower()}"
                file_combinations[base_sig] += 1
                
                # Final sequence = (What's already in the DB) + (What we found so far in this loop)
                occurrence = db_existing_count + file_combinations[base_sig]
                
                # 5. Build Fingerprint Hash
                tx_hash = cls.generate_transaction_hash(
                    account_id=account_id, date=raw_date, amount=amount,
                    is_income=is_income, description=description, occurrence=occurrence
                )
                
                # 6. Deduplication Check
                exists = db.query(Expense).filter(Expense.transaction_hash == tx_hash).first()
                if exists:
                    skipped_count += 1
                    logger.debug(f"Row #{row_num} skipped: Hash collision caught via Deduplication Engine.")
                    continue

                # 7. Instatiate a transient Expense object BEFORE categorisation
                new_expense = Expense(
                    account_id=account_id,
                    date=parsed_date,
                    amount=amount,
                    is_income=is_income,
                    description=description,
                    notes=notes,
                    transaction_hash=tx_hash,
                    category="Uncategorized"
                )
                
                # 8. Classification Engine Trigger
                assigned_cat = match_rule_based_category(new_expense, all_rules, logger)
                # if assigned_cat == "Uncategorized":
                #     assigned_cat = classify_description_with_ai(description, flat_categories)
                
                # 9. Insert Record
                new_expense = Expense(
                    account_id=account_id,
                    date=parsed_date,
                    amount=amount,
                    is_income=is_income,
                    description=description,
                    notes=notes,
                    transaction_hash=tx_hash,
                    category=assigned_cat
                )
                db.add(new_expense)
                added_count += 1
                
            except Exception as row_error:
                error_count += 1
                logger.warning(f"Skipped row #{row_num} due to formatting exception: {str(row_error)}")
                continue
                
        db.commit()
        logger.info(f"Ingestion Finished. Added: {added_count} | Skipped: {skipped_count} | Errors: {error_count}")
        return {"added": added_count, "skipped": skipped_count}