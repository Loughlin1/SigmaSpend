# backend-python/app/api/endpoints/ingestion.py
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.parser import StatementParserService
from app.models.bank_account import BankAccount

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


# ============================================================================
# CSV Upload Endpoint (with Account Selection)
# ============================================================================

@router.post("/upload/csv", status_code=status.HTTP_201_CREATED)
async def upload_csv_statement(
    files: List[UploadFile] = File(..., description="CSV files to upload"),
    account_id: int = Query(..., description="Bank account ID to associate with this import"),
    db: Session = Depends(get_db)
):
    """
    Upload and process one or more CSV bank statements.
    """
    if not files:
        logger.warning("Upload triggered with no files attached.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded. Attach one or more CSV files."
        )

    file_names = [f.filename for f in files if f.filename]
    logger.info(f"Starting CSV statement upload process for account '{account_id}'. Files: {file_names}")

    for file in files:
        if file.filename and not file.filename.lower().endswith('.csv'):
            logger.warning(f"Rejected file entry due to invalid extension: '{file.filename}'")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Only CSV files are supported."
            )
    
    # Verify account exists
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

        for file in files:
            logger.info(f"Processing file contents for statement: '{file.filename}'")
            contents = await file.read()
            decoded_contents = contents.decode("utf-8")
            
            result = StatementParserService.process_csv(
                decoded_contents,
                db,
                account_id=account_id,
            )
            
            added = result.get("added", 0)
            skipped = result.get("skipped", 0)
            categorized = result.get("categorized", 0)
            uncategorized = result.get("uncategorized", 0)
            
            logger.info(f"File '{file.filename}' ingestion metrics -> Added: {added}, Skipped (Duplicates): {skipped}")
            
            total_added += added
            total_skipped += skipped
            total_categorized += categorized
            total_uncategorized += uncategorized

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
                "uncategorized": total_uncategorized
            },
            "files_processed": len(files)
        }
    except Exception as e:
        # Crucial: log stacktrace for unhandled parsing or database dependency faults
        logger.exception(f"Fatal crash inside CSV statement parsing wrapper for account '{account_id}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while handling the files: {str(e)}"
        )