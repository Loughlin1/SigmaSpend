from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.ingestion import UploadService

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.post("/statement", status_code=status.HTTP_201_CREATED)
async def upload_bank_statement(
    files: List[UploadFile] = File(..., description="Statement files to upload (.csv or .pdf)"),
    account_id: int = Query(..., description="Bank account ID to associate with this import"),
    db: Session = Depends(get_db),
):
    if not files:
        logger.warning("Upload triggered with no files attached.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded. Attach one or more CSV or PDF files.",
        )

    file_names = [f.filename for f in files if f.filename]
    logger.info(f"Starting bank statement upload for account '{account_id}'. Files: {file_names}")

    UploadService.validate_extensions(files)
    UploadService.get_active_account(db, account_id)
    summary = await UploadService.process_files(files, db, account_id)

    logger.info(
        f"Upload finished for account '{account_id}'. "
        f"Processed {len(files)} file(s). Summary -> Added: {summary['added']}, Skipped: {summary['skipped']}"
    )

    return {
        "status": "success",
        "account_id": account_id,
        "summary": summary,
        "files_processed": len(files),
    }
