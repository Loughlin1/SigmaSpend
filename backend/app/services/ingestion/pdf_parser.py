# app/services/pdf_parser.py
import io
import re
from collections import defaultdict
from datetime import datetime, date
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
import pdfplumber
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.category_rules import CategoryRule
from app.services.ingestion.parser import StatementParserService

import logging
logger = logging.getLogger("sigmaspend")


class PDFStatementParser:
    """
    Spatial PDF parser. Reconstructs table rows from word bounding boxes,
    using configurable column-gap detection to split columns with double spaces.

    Regex format: 3 groups (date)(description)(amount) where amount has a CR/DR suffix.
    """

    YEAR_HEADER_PATTERN = re.compile(r"\b(20[2-9]\d)\b")

    # ------------------------------------------------------------------ #
    #  Public entry point                                                  #
    # ------------------------------------------------------------------ #

    @classmethod
    def parse_and_ingest(
        cls, file_stream: io.BytesIO, db: Session, account_id: int, logger: logging.Logger
    ) -> dict:
        if account_id is None:
            logger.warning("[PDF] Aborting: no account_id provided.")
            return {}

        config = cls._load_config(db, account_id)
        logger.info(
            f"[PDF] Config loaded: col_gap_mode={config['col_gap_mode']}, "
            f"col_gap_px={config['col_gap_px']}"
        )

        statement_years = cls._extract_statement_years(file_stream, logger)
        logger.info(f"[PDF] Statement years: {statement_years}")

        all_rules = db.query(CategoryRule).all()
        _, category_map = StatementParserService._get_category_cache(db)

        file_combinations: defaultdict = defaultdict(int)
        counters = dict(added=0, skipped=0, error=0, categorized=0, uncategorized=0)
        pending = None

        file_stream.seek(0)

        with pdfplumber.open(file_stream) as pdf:
            for page_idx, page in enumerate(pdf.pages, start=1):
                words = page.extract_words(horizontal_ltr=True, y_tolerance=3, x_tolerance=1)
                if not words:
                    continue

                for line_words in cls._group_lines(words):
                    reconstructed, gap_log = cls._reconstruct_line(
                        line_words, config["col_gap_mode"], config["col_gap_px"]
                    )

                    if not reconstructed:
                        continue

                    if gap_log:
                        logger.info(f"[PDF GAPS] {reconstructed!r}")
                        logger.info(f"[PDF GAPS] {' | '.join(gap_log)}")

                    if any(kw in reconstructed.lower() for kw in config["bypass_keywords"]):
                        continue

                    logger.info(f"[PDF LINE] {reconstructed!r}")

                    match = config["row_pattern"].match(reconstructed)
                    if match:
                        pending = cls._flush_and_parse(
                            pending, match, statement_years,
                            account_id, db, all_rules, category_map,
                            file_combinations, counters, logger,
                        )
                    elif pending is not None:
                        continuation = reconstructed.strip()
                        if continuation:
                            pending["description"] += " " + continuation
                            logger.info(f"[PDF CONT] appended: {continuation!r}")

                cls._flush_pending(
                    pending, account_id, db, all_rules, category_map,
                    file_combinations, counters, logger,
                )
                pending = None

        db.commit()

        return {
            "added":         counters["added"],
            "skipped":       counters["skipped"],
            "categorized":   counters["categorized"],
            "uncategorized": counters["uncategorized"],
        }

    # ------------------------------------------------------------------ #
    #  Config loading                                                      #
    # ------------------------------------------------------------------ #

    @classmethod
    def _load_config(cls, db: Session, account_id: int) -> dict:
        bank_config = StatementParserService.get_account_bank_config(db, account_id)
        mappings = bank_config.get("mappings", {})

        custom_regex_str = mappings.get("pdf_regex")
        if not custom_regex_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF parsing rules are missing for this account. Please update configurations.",
            )

        bypass_keywords = [
            kw.strip().lower()
            for kw in mappings.get("pdf_header_bypass", "date of transaction,page").split(",")
        ]

        # "fixed" (default): use pdf_col_gap_px as an absolute pixel threshold.
        # "relative": compute 2.5× median inter-word gap per line (adapts to PDF typography).
        col_gap_mode = mappings.get("pdf_col_gap_mode", "fixed")
        col_gap_px   = float(mappings.get("pdf_col_gap_px", 15))

        return {
            "row_pattern":     re.compile(custom_regex_str, re.IGNORECASE),
            "bypass_keywords": bypass_keywords,
            "col_gap_mode":    col_gap_mode,
            "col_gap_px":      col_gap_px,
        }

    # ------------------------------------------------------------------ #
    #  Line grouping                                                       #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _group_lines(words: list) -> list:
        """Group pdfplumber word dicts by their vertical position."""
        lines_dict: defaultdict = defaultdict(list)
        for w in words:
            lines_dict[round(w["top"], 1)].append(w)
        return [
            sorted(lines_dict[top], key=lambda x: x["x0"])
            for top in sorted(lines_dict)
        ]

    # ------------------------------------------------------------------ #
    #  Line reconstruction                                                 #
    # ------------------------------------------------------------------ #

    @classmethod
    def _reconstruct_line(
        cls, line_words: list, col_gap_mode: str, col_gap_px: float
    ) -> Tuple[str, list]:
        """
        Reconstruct a single line from word bounding boxes.
        Inserts double space at column boundaries, single space within columns.
        Returns (reconstructed_string, gap_log_entries).
        """
        if not line_words:
            return "", []

        gaps = [
            curr["x0"] - prev.get("x1", prev["x0"])
            for prev, curr in zip(line_words, line_words[1:])
        ]

        threshold = cls._compute_threshold(gaps, col_gap_mode, col_gap_px)

        parts = [line_words[0]["text"]]
        gap_log = []
        for i, (prev, curr) in enumerate(zip(line_words, line_words[1:])):
            gap = gaps[i]
            is_col = gap > threshold
            parts.append("  " if is_col else " ")
            parts.append(curr["text"])
            tag = f"[COL thr={threshold:.1f}]" if is_col else ""
            gap_log.append(f"'{prev['text']}'→'{curr['text']}' gap={gap:.1f}px {tag}")

        return "".join(parts).strip(), gap_log

    @staticmethod
    def _compute_threshold(gaps: list, mode: str, fixed_px: float) -> float:
        """
        "fixed": return fixed_px unchanged.
        "relative": 2.5× the median inter-word gap on this line, floored at 4px.
        """
        if mode == "fixed" or not gaps:
            return fixed_px

        sorted_gaps = sorted(gaps)
        mid = len(sorted_gaps) // 2
        median = (
            sorted_gaps[mid] if len(sorted_gaps) % 2
            else (sorted_gaps[mid - 1] + sorted_gaps[mid]) / 2
        )
        return max(median * 2.5, 4.0)

    # ------------------------------------------------------------------ #
    #  Row parsing                                                         #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _parse_groups(groups: tuple) -> Tuple[str, str, float, bool]:
        """Extract (raw_date, description, amount, is_income) from 3 regex groups (date, description, amount with CR/DR suffix)."""
        raw_date, raw_desc, raw_amount = groups
        raw_upper = raw_amount.upper().replace("£", "").replace(",", "").strip()
        is_credit = "CR" in raw_upper
        clean = raw_upper.replace("CR", "").replace("DR", "").strip()
        return raw_date, raw_desc, abs(float(clean)), is_credit

    # ------------------------------------------------------------------ #
    #  Transaction flushing                                                #
    # ------------------------------------------------------------------ #

    @classmethod
    def _flush_and_parse(
        cls, pending, match, statement_years,
        account_id, db, all_rules, category_map,
        file_combinations, counters, logger,
    ) -> Optional[dict]:
        """Flush the previous pending transaction, then build the next one from match."""
        cls._flush_pending(
            pending, account_id, db, all_rules, category_map,
            file_combinations, counters, logger,
        )
        try:
            raw_date, raw_desc, amount, is_income = cls._parse_groups(match.groups())
            parsed_date = cls._normalize_date(raw_date.strip(), statement_years)
            return {
                "description": raw_desc.strip(),
                "parsed_date": parsed_date,
                "amount":      amount,
                "is_income":   is_income,
            }
        except Exception as e:
            counters["error"] += 1
            logger.warning(f"[PDF] Could not parse matched line: {e}")
            return None

    @staticmethod
    def _flush_pending(
        pending, account_id, db, all_rules, category_map,
        file_combinations, counters, logger,
    ):
        if pending is None:
            return
        try:
            description = pending["description"]
            parsed_date = pending["parsed_date"]
            amount      = pending["amount"]
            is_income   = pending["is_income"]

            date_string = parsed_date.strftime("%d/%m/%Y")
            base_sig = f"{account_id}_{date_string}_{amount}_{is_income}_{description.lower()}"
            file_combinations[base_sig] += 1

            tx_hash = StatementParserService.generate_transaction_hash(
                account_id=account_id, date=date_string, amount=amount,
                is_income=is_income, description=description,
                occurrence=file_combinations[base_sig],
            )

            if db.query(Expense).filter(Expense.transaction_hash == tx_hash).first():
                counters["skipped"] += 1
                return

            new_expense = Expense(
                account_id=account_id,
                date=parsed_date,
                amount=amount,
                is_income=is_income,
                description=description,
                notes="",
                transaction_hash=tx_hash,
                category_id=None,
            )

            cat_id = StatementParserService._assign_category(new_expense, all_rules, category_map)
            new_expense.category_id = cat_id
            if cat_id:
                counters["categorized"] += 1
            else:
                counters["uncategorized"] += 1

            db.add(new_expense)
            counters["added"] += 1
            logger.info(f"✅ [PDF] {date_string} | {description} | £{amount} | income={is_income}")

        except Exception as e:
            counters["error"] += 1
            logger.warning(f"[PDF] Failed to flush row: {e}")

    # ------------------------------------------------------------------ #
    #  Year detection                                                      #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _extract_statement_years(file_stream: io.BytesIO, logger: logging.Logger) -> List[int]:
        current_year = datetime.now().year
        try:
            with pdfplumber.open(file_stream) as pdf:
                if pdf.pages:
                    text = pdf.pages[0].extract_text() or ""
                    raw = PDFStatementParser.YEAR_HEADER_PATTERN.findall(text)
                    valid = {int(y) for y in raw if 2020 <= int(y) <= current_year + 1}
                    if valid:
                        years = sorted(valid)
                        logger.info(f"[PDF Year] Found: {years}")
                        return years
        except Exception as e:
            logger.warning(f"[PDF Year] Error scanning: {e}")

        logger.warning(f"[PDF Year] Falling back to current year: {current_year}")
        return [current_year]

    # ------------------------------------------------------------------ #
    #  Date normalisation                                                  #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _normalize_date(date_str: str, detected_years: List[int]) -> date:
        for target_year in detected_years:
            try:
                parsed = datetime.strptime(f"{date_str} {target_year}", "%d %B %Y").date()
                if len(detected_years) > 1:
                    if parsed.month == 12 and target_year == max(detected_years):
                        continue
                    if parsed.month == 1 and target_year == min(detected_years):
                        continue
                return parsed
            except ValueError:
                pass

        for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d %b %Y"):
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        raise ValueError(f"Unsupported date format: '{date_str}'")
