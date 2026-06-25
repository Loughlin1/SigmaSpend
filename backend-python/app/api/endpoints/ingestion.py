# backend-python/app/api/endpoints/ingestion.py
import io
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.parser import StatementParserService
from app.services.pdf_parser import PDFStatementParser
from app.models.bank_account import BankAccount

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()

# ============================================================================
# Dynamic Statement Upload Endpoint (Supports CSV & PDF)
# ============================================================================

@router.post("/upload/statement", status_code=status.HTTP_201_CREATED)
async def upload_bank_statement(
    files: List[UploadFile] = File(..., description="Statement files to upload (.csv or .pdf)"),
    account_id: int = Query(..., description="Bank account ID to associate with this import"),
    db: Session = Depends(get_db)
):
    """
    Upload and process one or more bank statements in either CSV or PDF format.
    """
    if not files:
        logger.warning("Upload triggered with no files attached.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded. Attach one or more CSV or PDF files."
        )

    file_names = [f.filename for f in files if f.filename]
    logger.info(f"Starting bank statement upload process for account '{account_id}'. Files: {file_names}")

    # 1. Validate file formats globally before starting ingestion
    for file in files:
        if file.filename:
            ext = file.filename.lower()
            if not (ext.endswith('.csv') or ext.endswith('.pdf')):
                logger.warning(f"Rejected file entry due to invalid extension: '{file.filename}'")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid file format for '{file.filename}'. Only CSV and PDF files are supported."
                )
    
    # 2. Verify targeted bank account metrics exist and are healthy
    account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not account:
        logger.warning(f"Ingestion rejected: Bank account '{account_id}' does not exist.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bank account '{account_id}' not found. Create it first via POST /accounts"
        )
    
    if account.is_active is False:
        logger.warning(f"Ingestion rejected: Bank account '{account_id}' is inactive.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Account '{account_id}' is inactive"
        )
    
    try:
        total_added = 0
        total_skipped = 0
        total_categorized = 0
        total_uncategorized = 0
        total_errors = 0

        # 3. Dynamic layout file iteration
        for file in files:
            if not file.filename:
                continue
                
            logger.info(f"Processing file contents for statement: '{file.filename}'")
            filename_lower = file.filename.lower()
            
            # --- PATH A: CSV PROCESSING PIPELINE ---
            if filename_lower.endswith('.csv'):
                contents = await file.read()
                decoded_contents = contents.decode("utf-8")
                
                result = StatementParserService.process_csv(
                    decoded_contents,
                    db,
                    account_id=account_id,
                )
            
            # --- PATH B: PDF PROCESSING PIPELINE ---
            elif filename_lower.endswith('.pdf'):
                file_bytes = await file.read()
                pdf_stream = io.BytesIO(file_bytes)
                
                # Extract and push transaction rows directly into the deduplication/saving engine
                # Note: Ensure your PDF service returns a dictionary containing metrics matching this layout keys
                result = PDFStatementParser.parse_and_ingest(
                    pdf_stream,
                    db,
                    account_id=account_id,
                    logger=logger
                )
            else:
                logger.warning(f"Ingestion rejected: filename extension not supported")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Filename extension {file.filename} not supported"
                )
            
            # Accumulate file-specific summary metrics
            added = result.get("added", 0)
            skipped = result.get("skipped", 0)
            categorized = result.get("categorized", 0)
            uncategorized = result.get("uncategorized", 0)
            errors = result.get("errors", 0)

            logger.info(f"File '{file.filename}' ingestion metrics -> Added: {added}, Skipped (Duplicates): {skipped}, Errors: {errors}")

            total_added += added
            total_skipped += skipped
            total_categorized += categorized
            total_uncategorized += uncategorized
            total_errors += errors

        logger.info(
            f"Ingestion lifecycle finished for account '{account_id}'. "
            f"Processed {len(files)} file(s). Summary -> Total Added: {total_added}, Total Skipped: {total_skipped}"
        )

        return {
            "status": "success",
            "account_id": account_id,
            "summary": {
                "added": total_added,
                "skipped": total_skipped,
                "categorized": total_categorized,
                "uncategorized": total_uncategorized,
                "errors": total_errors
            },
            "files_processed": len(files)
        }
    except Exception as e:
        logger.exception(f"Fatal crash inside bank statement parsing wrapper for account '{account_id}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while handling the files: {str(e)}"
        )