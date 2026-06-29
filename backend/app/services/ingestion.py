import io
import logging
from typing import List

from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.models.bank_account import BankAccount
from app.services.parser import StatementParserService
from app.services.pdf_parser import PDFStatementParser

logger = logging.getLogger("sigmaspend")

SUPPORTED_EXTENSIONS = (".csv", ".pdf")


class IngestionService:
    @staticmethod
    def validate_extensions(files: List[UploadFile]) -> None:
        for file in files:
            if file.filename:
                ext = file.filename.lower()
                if not any(ext.endswith(e) for e in SUPPORTED_EXTENSIONS):
                    logger.warning(f"Rejected file entry due to invalid extension: '{file.filename}'")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid file format for '{file.filename}'. Only CSV and PDF files are supported.",
                    )

    @staticmethod
    def get_active_account(db: Session, account_id: int) -> BankAccount:
        account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
        if not account:
            logger.warning(f"Ingestion rejected: Bank account '{account_id}' does not exist.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bank account '{account_id}' not found. Create it first via POST /accounts",
            )
        if account.is_active is False:
            logger.warning(f"Ingestion rejected: Bank account '{account_id}' is inactive.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account '{account_id}' is inactive",
            )
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
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Filename extension {file.filename} not supported",
                )

            logger.info(
                f"File '{file.filename}' ingestion metrics -> "
                f"Added: {result.get('added', 0)}, Skipped: {result.get('skipped', 0)}, "
                f"Errors: {result.get('errors', 0)}"
            )
            for key in totals:
                totals[key] += result.get(key, 0)

        return totals
