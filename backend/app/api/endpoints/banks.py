from typing import List
from fastapi import APIRouter

from app.services.bank import BankService, BankProfile

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.get("/", response_model=List[BankProfile])
def list_banks():
    banks = BankService.list_all()
    logger.info(f"[Banks] Returning {len(banks)} bank profiles")
    return banks
