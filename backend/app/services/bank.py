import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

import yaml
from pydantic import BaseModel

from app.exceptions import InternalError

logger = logging.getLogger("sigmaspend")

BANKS_CONFIG_PATH = Path(__file__).parent.parent / "core" / "banks.yaml"


class BankProfile(BaseModel):
    name: str
    country: str
    default_amount_style: Optional[str] = None
    default_invert_amounts: Optional[bool] = None
    default_mappings: Optional[Dict[str, Any]] = None


class BankService:
    @staticmethod
    def list_all() -> List[BankProfile]:
        if not BANKS_CONFIG_PATH.exists():
            logger.error(f"[Banks] Config file not found at {BANKS_CONFIG_PATH}")
            raise InternalError("Bank configuration file is missing.")
        with open(BANKS_CONFIG_PATH, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        return [BankProfile(**b) for b in data.get("banks", [])]
