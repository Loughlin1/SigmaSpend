import io
import logging
from typing import List

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.bank_account import BankAccount
from app.exceptions import AccountNotFoundError, AccountInactiveError, InvalidFileFormatError
from app.services.ingestion.parser import StatementParserService
from app.services.ingestion.pdf_parser import PDFStatementParser

logger = logging.getLogger("sigmaspend")

SUPPORTED_EXTENSIONS = (".csv", ".pdf")


class UploadService:
    @staticmethod
    def validate_extensions(files: List[UploadFile]) -> None:
        for file in files:
            if file.filename:
                ext = file.filename.lower()
                if not any(ext.endswith(e) for e in SUPPORTED_EXTENSIONS):
                    logger.warning(f"Rejected file entry due to invalid extension: '{file.filename}'")
                    raise InvalidFileFormatError(
                        f"Invalid file format for '{file.filename}'. Only CSV and PDF files are supported."
                    )

    @staticmethod
    def get_active_account(db: Session, account_id: int) -> BankAccount:
        account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
        if not account:
            logger.warning(f"Upload rejected: Bank account '{account_id}' does not exist.")
            raise AccountNotFoundError(
                f"Bank account '{account_id}' not found. Create it first via POST /accounts"
            )
        if account.is_active is False:
            logger.warning(f"Upload rejected: Bank account '{account_id}' is inactive.")
            raise AccountInactiveError(f"Account '{account_id}' is inactive")
        return account

    @staticmethod
    async def process_files(files: List[UploadFile], db: Session, account_id: int) -> dict:
        totals = {"added": 0, "skipped": 0, "categorized": 0, "uncategorized": 0, "errors": 0}

        for file in files:
            if not file.filename:
                continue

            logger.info(f"Processing file contents for statement: '{file.filename}'")
            filename_lower = file.filename.lower()

            if filename_lower.endswith(".csv"):
                contents = await file.read()
                result = StatementParserService.process_csv(
                    contents.decode("utf-8"), db, account_id=account_id
                )
            elif filename_lower.endswith(".pdf"):
                file_bytes = await file.read()
                result = PDFStatementParser.parse_and_ingest(
                    io.BytesIO(file_bytes), db, account_id=account_id, logger=logger
                )
            else:
                raise InvalidFileFormatError(f"File extension not supported: '{file.filename}'")

            logger.info(
                f"File '{file.filename}' metrics -> "
                f"Added: {result.get('added', 0)}, Skipped: {result.get('skipped', 0)}, "
                f"Errors: {result.get('errors', 0)}"
            )
            for key in totals:
                totals[key] += result.get(key, 0)

        return totals
