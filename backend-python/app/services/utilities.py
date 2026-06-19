from datetime import date
from dateutil import parser
from dateutil.parser import ParserError
from typing import Optional
from fastapi import HTTPException
import logging


def parse_uk_date(date_str: Optional[str], logger: logging.Logger) -> Optional[date]:
    if not date_str:
        return None
    if isinstance(date_str, date):
        return date_str
    try:
        # Automatically processes YYYY-MM-DD and prioritises DD/MM/YYYY text streams
        return parser.parse(str(date_str), dayfirst=True).date()
    except (ParserError, TypeError):
        logger.warning(f"Date parsing failed for input: '{date_str}'")
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid date format: '{date_str}'. Please provide a readable date layout."
        )