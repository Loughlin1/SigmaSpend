# app/api/endpoints/banks.py
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import yaml

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()

BANKS_CONFIG_PATH = Path(__file__).parent.parent.parent / "core" / "banks.yaml"


class BankProfile(BaseModel):
    name: str
    country: str
    default_amount_style: Optional[str] = None
    default_invert_amounts: Optional[bool] = None
    default_mappings: Optional[Dict[str, Any]] = None


def _load_banks() -> List[BankProfile]:
    if not BANKS_CONFIG_PATH.exists():
        logger.error(f"[Banks] Config file not found at {BANKS_CONFIG_PATH}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bank configuration file is missing."
        )
    with open(BANKS_CONFIG_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return [BankProfile(**b) for b in data.get("banks", [])]


@router.get("/", response_model=List[BankProfile])
def list_banks():
    """Return all known bank profiles from the static configuration file."""
    banks = _load_banks()
    logger.info(f"[Banks] Returning {len(banks)} bank profiles")
    return banks
