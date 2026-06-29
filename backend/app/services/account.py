import logging
from typing import List
from sqlalchemy.orm import Session

from app.models.bank_account import BankAccount
from app.schemas.bank_account import BankAccountCreate, BankAccountUpdate
from app.exceptions import AccountNotFoundError, DuplicateAccountError

logger = logging.getLogger("sigmaspend")


class AccountService:
    @staticmethod
    def list_all(db: Session, active_only: bool = True) -> List[BankAccount]:
        query = db.query(BankAccount)
        if active_only:
            query = query.filter(BankAccount.is_active == True)
        return query.all()

    @staticmethod
    def get_by_id(db: Session, account_id: int) -> BankAccount:
        account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
        if not account:
            raise AccountNotFoundError(f"Account '{account_id}' not found")
        return account

    @staticmethod
    def create(db: Session, account_in: BankAccountCreate) -> BankAccount:
        if db.query(BankAccount).filter(BankAccount.account_name == account_in.account_name).first():
            raise DuplicateAccountError(f"Account '{account_in.account_name}' already exists")
        db_account = BankAccount(**account_in.dict())
        db.add(db_account)
        db.commit()
        db.refresh(db_account)
        logger.info(f"Successfully created bank account: ID {db_account.id} ({db_account.bank_name})")
        return db_account

    @staticmethod
    def update(db: Session, account_id: int, account_in: BankAccountUpdate) -> BankAccount:
        account = AccountService.get_by_id(db, account_id)
        update_data = account_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(account, field, value)
        db.add(account)
        db.commit()
        db.refresh(account)
        logger.info(f"Successfully updated fields {list(update_data.keys())} for account '{account_id}'")
        return account
