# backend/app/api/endpoints/accounts.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.bank_account import BankAccount
from app.schemas.bank_account import BankAccountCreate, BankAccountResponse, BankAccountUpdate

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


# ============================================================================
# Bank Account Management Endpoints
# ============================================================================

@router.post("/", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
def create_bank_account(
    account_in: BankAccountCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new bank account for CSV uploads.
    """
    existing = db.query(BankAccount).filter(BankAccount.account_name == account_in.account_name).first()
    if existing:
        logger.warning(f"Account creation conflict: ID '{account_in.account_name}' already exists")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Account '{account_in.account_name}' already exists"
        )
    
    db_account = BankAccount(**account_in.dict())
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    
    logger.info(f"Successfully created bank account: ID {db_account.id} ({db_account.bank_name})")
    return db_account


@router.get("/", response_model=List[BankAccountResponse])
def list_bank_accounts(
    db: Session = Depends(get_db),
    active_only: bool = Query(True, description="Filter to active accounts only")
):
    """
    List all bank accounts.
    """
    query = db.query(BankAccount)
    if active_only:
        query = query.filter(BankAccount.is_active == True)
    
    accounts = query.all()
    logger.info(f"Retrieved {len(accounts)} bank accounts (active_only={active_only})")
    return accounts


@router.get("/{account_id}", response_model=BankAccountResponse)
def get_bank_account(
    account_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve details of a specific bank account."""
    account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not account:
        logger.warning(f"Lookup failed: Bank account '{account_id}' not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account '{account_id}' not found"
        )
    return account


@router.put("/{account_id}", response_model=BankAccountResponse)
def update_bank_account(
    account_id: int,
    account_in: BankAccountUpdate,
    db: Session = Depends(get_db)
):
    """Update bank account details."""
    account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not account:
        logger.warning(f"Update failed: Bank account '{account_id}' not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account '{account_id}' not found"
        )
    
    update_data = account_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)
    
    db.add(account)
    db.commit()
    db.refresh(account)
    
    logger.info(f"Successfully updated fields {list(update_data.keys())} for account '{account_id}'")
    return account

