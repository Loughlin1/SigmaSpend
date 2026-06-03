from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.services.parser import StatementParserService

router = APIRouter()

@router.post("/upload/csv", status_code=status.HTTP_201_CREATED)
async def upload_csv_statement(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    if file.filename and not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid file format. Only CSV files are supported."
        )
        
    try:
        contents = await file.read()
        decoded_contents = contents.decode("utf-8")
        
        result = StatementParserService.process_csv(decoded_contents, db)
        return {
            "status": "success",
            "summary": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while handling the file: {str(e)}"
        )