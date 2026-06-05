import csv
import yaml
import hashlib
from io import StringIO
from pathlib import Path
from collections import defaultdict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from dateutil import parser as date_parser

from app.models.expense import Expense
from app.models.bank_account import BankAccount
from app.services.classifier import match_rule_based_category, classify_description_with_ai
from app.models.category_rules import CategoryRule
from app.models.category import Category


class StatementParserService:
    
    @staticmethod
    def load_bank_config(bank_profile: str = None) -> dict:
        """
        Loads the configuration YAML and returns the ruleset for the 
        currently active bank/account profile.
        
        Args:
            bank_profile: Specific profile to load. If None, loads the active_bank.
        """
        config_path = Path(__file__).parent.parent / "core" / "config.yaml"
        
        if not config_path.exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Configuration file missing at expected path: {config_path}"
            )
            
        with open(config_path, "r", encoding="utf-8") as file:
            try:
                config_data = yaml.safe_load(file)
            except yaml.YAMLError as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to parse config.yaml syntax: {str(e)}"
                )
        
        # Use provided profile or fall back to active_bank
        active_bank = bank_profile or config_data.get("active_bank")
        bank_rules = config_data.get("banks", {}).get(active_bank)
        
        if not bank_rules:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bank profile '{active_bank}' is not defined in config.yaml."
            )
            
        return bank_rules

    @classmethod
    def get_account_bank_config(cls, db: Session, account_id: str, bank_profile: str = None) -> dict:
        account = db.query(BankAccount).filter(BankAccount.account_id == account_id).first()
        if not account:
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

        if bank_profile:
            return cls.load_bank_config(bank_profile)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bank configuration for account '{account_id}' is missing. Set mappings when creating the account."
        )

    @staticmethod
    def generate_transaction_hash(
        account_id: str, date: str, amount: float, is_income: bool, description: str, occurrence: int
    ) -> str:
        """
        Generates a deterministic unique MD5 hash for a transaction line item.
        Baking the account_id and is_income status alongside the transaction occurrence
        guarantees isolation across card boundaries and identical sequence items.
        """
        normalized_desc = description.strip().lower()
        base_signature = f"{account_id}_{date}_{amount}_{is_income}_{normalized_desc}_occ{occurrence}"
        return hashlib.md5(base_signature.encode("utf-8")).hexdigest()

    @classmethod
    def process_csv(cls, file_contents: str, db: Session, account_id: str = None, bank_profile: str = None) -> dict:
        """
        Parses a raw statement CSV, normalizes financial directionality layouts, 
        and securely passes items through the sequential deduplication counter.
        
        Args:
            file_contents: Raw CSV file content
            db: Database session
            account_id: Bank account ID (if None, loads from config)
            bank_profile: Bank profile name from config.yaml (if None, uses active_bank)
        """
        if account_id:
            bank_config = cls.get_account_bank_config(db, account_id, bank_profile)
        else:
            bank_config = cls.load_bank_config(bank_profile)
        
        # Use provided account_id or fall back to config
        if account_id is None:
            account_id = bank_config["account_id"]
        
        amount_style = bank_config.get("amount_style", "single_column")
        mappings = bank_config["mappings"]
        all_rules = db.query(CategoryRule).all()
        # Flattening out nested subcategories to present the AI with all options
        flat_categories = []
        db_categories = db.query(Category).all()
        for cat in db_categories:
            flat_categories.append(cat.name)
            for sub in cat.subcategories:
                flat_categories.append(sub.name)
        # Remove duplicates to keep the array clean
        flat_categories = list(set(flat_categories))

        csv_file = StringIO(file_contents)
        reader = csv.DictReader(csv_file)
        
        # Memory structure to track sequence weights within this specific file parsing thread
        seen_combinations = defaultdict(int)
        
        added_count = 0
        skipped_count = 0

        for row_num, row in enumerate(reader, start=1):
            try:
                # 1. Check for specific card/account filters if configured in the YAML profile
                if "filter_column" in bank_config and "filter_value" in bank_config:
                    file_val = row.get(mappings["filter_column"], "").strip()
                    if file_val != str(bank_config["filter_value"]):
                        continue # Belongs to a different card profile in a shared statement export

                # 2. Extract baseline details dynamically mapped via YAML profile keys
                raw_date = row[mappings["date_column"]].strip()
                description = row[mappings["description_column"]].strip()
                parsed_date = date_parser.parse(raw_date, dayfirst=True).date()

                amount = 0.0
                is_income = False

                # 3. Standardize monetary direction based on bank format variations
                if amount_style == "single_column":
                    raw_amount = float(row[mappings["amount_column"]].replace(",", ""))
                    if raw_amount >= 0:
                        amount = raw_amount
                        is_income = True
                    else:
                        amount = abs(raw_amount) # Store normalized positive value
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
                        continue # Row does not contain financial data (e.g., pending placeholder rows)

                # 4. Occurrence Strategy Optimization
                # The base signature mirrors parameters required to confirm valid transaction identical twins
                base_sig = f"{account_id}_{raw_date}_{amount}_{is_income}_{description.lower()}"
                seen_combinations[base_sig] += 1
                occurrence = seen_combinations[base_sig]
                
                # 5. Build unique structural constraint fingerprint
                tx_hash = cls.generate_transaction_hash(
                    account_id=account_id,
                    date=raw_date,
                    amount=amount,
                    is_income=is_income,
                    description=description,
                    occurrence=occurrence
                )
                
                # 6. Database Lookup validation check
                exists = db.query(Expense).filter(Expense.transaction_hash == tx_hash).first()
                if exists:
                    skipped_count += 1
                    continue
                
                # 7. Categorise expense (rules-based first then AI if not)
                assigned_cat = match_rule_based_category(description, all_rules)
                if not assigned_cat:
                    assigned_cat = classify_description_with_ai(description, flat_categories)

                # 8. Commit new record to database state
                new_expense = Expense(
                    account_id=account_id,
                    date=parsed_date,
                    amount=amount,
                    is_income=is_income,
                    description=description,
                    transaction_hash=tx_hash,
                    category=assigned_cat
                )
                db.add(new_expense)
                added_count += 1
                
            except (KeyError, ValueError, TypeError):
                # Gracefully catch empty formatting rows or corrupted strings on custom line boundaries
                continue
                
        # Flush the transaction data blocks to SQLite memory safely
        db.commit()
        return {"added": added_count, "skipped": skipped_count}