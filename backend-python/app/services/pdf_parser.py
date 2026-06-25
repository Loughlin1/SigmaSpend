# app/services/pdf_parser.py
import io
import re
import json
from collections import defaultdict
from sqlalchemy.orm import Session, object_mapper
from datetime import datetime, date
from typing import List
from fastapi import HTTPException, status

import pdfplumber
from app.models.expense import Expense
from app.models.category_rules import CategoryRule
from app.services.parser import StatementParserService  

import logging
logger = logging.getLogger("sigmaspend")


class PDFStatementParser:
    """
    Dynamic spatial coordinate layout engine utilizing strict, required Regex mapping 
    definitions sourced straight from the targeted bank account configuration profile.
    Dynamically extracts the statement calendar year from page headers.
    """

    # Matches standard 4-digit years bound by word spaces (e.g., 2024, 2025, 2026)
    YEAR_HEADER_PATTERN = re.compile(r"\b(20[2-9]\d)\b")

    @classmethod
    def parse_and_ingest(cls, file_stream: io.BytesIO, db: Session, account_id: int, logger: logging.Logger) -> dict:
        if account_id is None:
            logger.warning("[PDF Spatial Parser] Aborting processing: No account_id provided.")
            return {}

        bank_config = StatementParserService.get_account_bank_config(db, account_id)
        mappings = bank_config.get("mappings", {})
        custom_regex_str = mappings.get("pdf_regex")
        
        if not custom_regex_str:
            logger.error(f"[PDF Spatial Parser] Ingestion rejected: Bank Account '{account_id}' has no custom 'pdf_regex'.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF parsing rules are missing for this account. Please update configurations."
            )

        row_pattern = re.compile(custom_regex_str, re.IGNORECASE)
        bypass_keywords = [kw.strip().lower() for kw in mappings.get("pdf_header_bypass", "date of transaction,page").split(",")]

        # 1. Dynamically scan the document text to find the statement year
        statement_years = cls._extract_statement_years(file_stream, logger)
        logger.info(f"[PDF Spatial Parser] Target processing calendar year resolved to: {statement_years}")

        all_rules = db.query(CategoryRule).all()
        flat_categories, category_map = StatementParserService._get_category_cache(db)

        file_combinations = defaultdict(int)
        added_count = 0
        skipped_count = 0
        error_count = 0
        categorized_count = 0
        uncategorized_count = 0

        # Reset stream position after text pre-scanning
        file_stream.seek(0)

        with pdfplumber.open(file_stream) as pdf:
            for page_idx, page in enumerate(pdf.pages, start=1):
                words = page.extract_words(horizontal_ltr=True, y_tolerance=3)
                if not words:
                    continue

                lines_dict = defaultdict(list)
                for w in words:
                    top_key = round(w["top"], 1)
                    lines_dict[top_key].append(w)

                sorted_tops = sorted(lines_dict.keys())

                for top_coord in sorted_tops:
                    line_words = sorted(lines_dict[top_coord], key=lambda x: x["x0"])

                    # Preserve column gaps as double spaces so \s{2,} in the regex
                    # can distinguish column boundaries from intra-word spaces.
                    if line_words:
                        parts = [line_words[0]["text"]]
                        for prev, curr in zip(line_words, line_words[1:]):
                            gap = curr["x0"] - prev.get("x1", prev["x0"])
                            parts.append("  " if gap > 20 else " ")
                            parts.append(curr["text"])
                        reconstructed_line = "".join(parts).strip()
                    else:
                        reconstructed_line = ""

                    if any(kw in reconstructed_line.lower() for kw in bypass_keywords):
                        continue

                    logger.info(f"[PDF DEBUG] Attempting match with regex: {row_pattern.pattern}")
                    logger.info(f"[PDF DEBUG] Testing reconstructed target line: '{reconstructed_line}'")

                    match = row_pattern.match(reconstructed_line)
                    if match:
                        raw_date_cell, raw_desc_cell, raw_amount_cell = match.groups()
                        
                        try:
                            description = raw_desc_cell.strip()
                            raw_amount_str = raw_amount_cell.upper().replace("£", "").replace(",", "").strip()
                            notes = ""
                            
                            is_credit = "CR" in raw_amount_str
                            clean_amount = raw_amount_str.replace("CR", "").replace("DR", "").strip()
                            raw_float = float(clean_amount)
                            amount = abs(raw_float)
                            is_income = is_credit
                            
                            # Pass the dynamically discovered year instead of datetime.now().year
                            parsed_date = cls._normalize_date(raw_date_cell.strip(), statement_years)
                            date_string = parsed_date.strftime("%d/%m/%Y")

                            base_sig = f"{account_id}_{date_string}_{amount}_{is_income}_{description.lower()}"
                            file_combinations[base_sig] += 1
                            occurrence = file_combinations[base_sig]

                            tx_hash = StatementParserService.generate_transaction_hash(
                                account_id=account_id, date=date_string, amount=amount,
                                is_income=is_income, description=description, occurrence=occurrence
                            )
                            
                            if db.query(Expense).filter(Expense.transaction_hash == tx_hash).first():
                                skipped_count += 1
                                continue

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

                            cat_id = StatementParserService._assign_category(new_expense, all_rules, category_map)
                            new_expense.category_id = cat_id  # type: ignore
                            
                            if cat_id:
                                categorized_count += 1
                            else:
                                uncategorized_count += 1

                            expense_dict = {
                                column.key: getattr(new_expense, column.key)
                                for column in object_mapper(new_expense).columns
                            }

                            if expense_dict.get("date"):
                                expense_dict["date"] = expense_dict["date"].isoformat()

                            json_string = json.dumps(expense_dict)
                            logger.info(f"✅ [PDF Spatial Parser] Parsed Extracted Row: {json_string}")
                            
                            db.add(new_expense)
                            added_count += 1

                        except Exception as row_error:
                            error_count += 1
                            logger.warning(f"[PDF Spatial Parser] Format translation skipped line. Error: {str(row_error)}")
                            continue
        
        db.commit()

        return {
            "added": added_count,
            "skipped": skipped_count,
            "categorized": categorized_count,
            "uncategorized": uncategorized_count
        }

    @staticmethod
    def _extract_statement_years(file_stream: io.BytesIO, logger: logging.Logger) -> List[int]:
        """
        Scans the first page text to find all valid, modern 4-digit calendar years.
        Filters out anomalies and returns a deduplicated, sorted list of integers.
        """
        # Establish a reasonable chronological boundary
        current_year = datetime.now().year  # Resolves to 2026
        minimum_valid_year = 2020
        maximum_valid_year = current_year + 1  # Allows parsing forward boundary cross-overs

        try:
            with pdfplumber.open(file_stream) as pdf:
                if pdf.pages:
                    first_page_text = pdf.pages[0].extract_text() or ""
                    
                    # Find all 4-digit numeric chunks bound by word spaces
                    raw_matches = PDFStatementParser.YEAR_HEADER_PATTERN.findall(first_page_text)
                    
                    # Convert to integers, filter out noise, and deduplicate using a set
                    valid_years = {
                        int(yr) for yr in raw_matches 
                        if minimum_valid_year <= int(yr) <= maximum_valid_year
                    }
                    
                    if valid_years:
                        sorted_years = sorted(list(valid_years))
                        logger.info(f"🎯 [PDF Year Scanner] Resolved clean boundary years: {sorted_years}")
                        return sorted_years
                        
        except Exception as e:
            logger.warning(f"[PDF Year Scanner] Error while pre-scanning for year metadata: {e}")
            
        # Fallback if no valid years are discovered in the text layout
        logger.warning(f"[PDF Year Scanner] No valid layout year found. Falling back to current year: {current_year}")
        return [current_year]

    @staticmethod
    def _normalize_date(date_str: str, detected_years: List[int]) -> date:
        """
        Translates '01 FEBRUARY' into a datetime.date object, intelligently selecting
        the correct year from the statement context to handle New Year cross-over anomalies.
        """
        # If the document contains multiple boundary years (e.g., [2025, 2026]), 
        # test them sequentially against standard text parsing rules.
        for target_year in detected_years:
            try:
                date_with_year = f"{date_str} {target_year}"
                parsed_dt = datetime.strptime(date_with_year, "%d %B %Y").date()
                
                # --- NEW YEAR CROSS-OVER PROTECTION GUARD ---
                # If the statement text spans across December/January, make sure an individual row
                # doesn't generate a date that swings outside the logic boundaries.
                # Example: If a transaction is labeled 'JANUARY' but we test it against '2025'
                # when the file context explicitly ranges into 2026, we check months to confirm accuracy.
                if len(detected_years) > 1:
                    # If this is a December row but we are trying to force it into the larger year, skip it
                    if parsed_dt.month == 12 and target_year == max(detected_years):
                        continue
                    # If this is a January row but we are trying to force it into the smaller year, skip it
                    if parsed_dt.month == 1 and target_year == min(detected_years):
                        continue
                        
                return parsed_dt
            except ValueError:
                pass

        # Native layout fallback configurations (e.g., formats that already include the year)
        for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d %b %Y"):
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
                
        raise ValueError(f"Unsupported string spatial date layout format: '{date_str}'")