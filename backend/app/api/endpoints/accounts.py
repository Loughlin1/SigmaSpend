from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.bank_account import BankAccountCreate, BankAccountResponse, BankAccountUpdate
from app.services.account import AccountService

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.post("/", response_model=BankAccountResponse, status_code=201)
def create_bank_account(account_in: BankAccountCreate, db: Session = Depends(get_db)):
    logger.info(f"Creating bank account: '{account_in.account_name}'")
    return AccountService.create(db, account_in)


@router.get("/", response_model=List[BankAccountResponse])
def list_bank_accounts(
    db: Session = Depends(get_db),
    active_only: bool = Query(True),
):
    accounts = AccountService.list_all(db, active_only=active_only)
    logger.info(f"Retrieved {len(accounts)} bank accounts (active_only={active_only})")
    return accounts


@router.get("/{account_id}", response_model=BankAccountResponse)
def get_bank_account(account_id: int, db: Session = Depends(get_db)):
    return AccountService.get_by_id(db, account_id)


@router.put("/{account_id}", response_model=BankAccountResponse)
def update_bank_account(account_id: int, account_in: BankAccountUpdate, db: Session = Depends(get_db)):
    return AccountService.update(db, account_id, account_in)
