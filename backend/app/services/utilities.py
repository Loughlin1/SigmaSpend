from datetime import date
from dateutil import parser
from dateutil.parser import ParserError
from typing import Optional
import logging

from app.exceptions import InvalidDateError


def parse_uk_date(date_str: Optional[str], logger: logging.Logger) -> Optional[date]:
    if not date_str:
        return None
    if isinstance(date_str, date):
        return date_str
    try:
        s = str(date_str).strip()
        import re as _re
        dayfirst = not bool(_re.match(r'^\d{4}-\d{2}-\d{2}$', s))
        return parser.parse(s, dayfirst=dayfirst).date()
    except (ParserError, TypeError):
        logger.warning(f"Date parsing failed for input: '{date_str}'")
        raise InvalidDateError(
            f"Invalid date format: '{date_str}'. Please provide a readable date layout."
        )
