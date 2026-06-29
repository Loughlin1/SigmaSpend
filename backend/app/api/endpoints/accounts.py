from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.bank_account import BankAccountCreate, BankAccountResponse, BankAccountUpdate
from app.services.account import AccountService

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.post("/", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
def create_bank_account(account_in: BankAccountCreate, db: Session = Depends(get_db)):
    if AccountService.find_by_name(db, account_in.account_name):
        logger.warning(f"Account creation conflict: '{account_in.account_name}' already exists")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Account '{account_in.account_name}' already exists",
        )
    return AccountService.create(db, account_in)


@router.get("/", response_model=List[BankAccountResponse])
def list_bank_accounts(
    db: Session = Depends(get_db),
    active_only: bool = Query(True, description="Filter to active accounts only"),
):
    accounts = AccountService.list_all(db, active_only=active_only)
    logger.info(f"Retrieved {len(accounts)} bank accounts (active_only={active_only})")
    return accounts


@router.get("/{account_id}", response_model=BankAccountResponse)
def get_bank_account(account_id: int, db: Session = Depends(get_db)):
    account = AccountService.get_by_id(db, account_id)
    if not account:
        logger.warning(f"Lookup failed: Bank account '{account_id}' not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account '{account_id}' not found")
    return account


@router.put("/{account_id}", response_model=BankAccountResponse)
def update_bank_account(account_id: int, account_in: BankAccountUpdate, db: Session = Depends(get_db)):
    account = AccountService.get_by_id(db, account_id)
    if not account:
        logger.warning(f"Update failed: Bank account '{account_id}' not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account '{account_id}' not found")
    return AccountService.update(db, account, account_in)
