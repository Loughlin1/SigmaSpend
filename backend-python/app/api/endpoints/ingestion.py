from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.services.parser import StatementParserService
from app.models.bank_account import BankAccount
from app.schemas.bank_account import BankAccountCreate, BankAccountResponse, BankAccountUpdate

router = APIRouter()


# ============================================================================
# Bank Account Management Endpoints
# ============================================================================

@router.post("/accounts", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
def create_bank_account(
    account_in: BankAccountCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new bank account for CSV uploads.
    
    - **account_id**: Unique identifier (e.g., 'checking_001')
    - **account_name**: Display name (e.g., 'My Checking Account')
    - **bank_name**: Bank name (e.g., 'Chase')
    - **amount_style**: CSV amount layout, either 'single_column' or 'split_columns'
    - **mappings**: Column mappings to parse the uploaded bank CSV
    - **bank_profile**: Optional legacy reference to a profile in config.yaml
    """
    # Check if account already exists
    existing = db.query(BankAccount).filter(BankAccount.account_id == account_in.account_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Account '{account_in.account_id}' already exists"
        )
    
    db_account = BankAccount(**account_in.dict())
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


@router.get("/accounts", response_model=List[BankAccountResponse])
def list_bank_accounts(
    db: Session = Depends(get_db),
    active_only: bool = Query(True, description="Filter to active accounts only")
):
    """
    List all bank accounts.
    
    - **active_only**: Set to false to include inactive accounts
    """
    query = db.query(BankAccount)
    if active_only:
        query = query.filter(BankAccount.is_active == True)
    
    return query.all()


@router.get("/accounts/{account_id}", response_model=BankAccountResponse)
def get_bank_account(
    account_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve details of a specific bank account."""
    account = db.query(BankAccount).filter(BankAccount.account_id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account '{account_id}' not found"
        )
    return account


@router.put("/accounts/{account_id}", response_model=BankAccountResponse)
def update_bank_account(
    account_id: str,
    account_in: BankAccountUpdate,
    db: Session = Depends(get_db)
):
    """Update bank account details."""
    account = db.query(BankAccount).filter(BankAccount.account_id == account_id).first()
    if not account:
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
    return account


# ============================================================================
# CSV Upload Endpoint (with Account Selection)
# ============================================================================

@router.post("/upload/csv", status_code=status.HTTP_201_CREATED)
async def upload_csv_statement(
    file: UploadFile = File(...),
    account_id: str = Query(..., description="Bank account ID to associate with this import"),
    db: Session = Depends(get_db)
):
    """
    Upload and process a CSV bank statement.
    
    **Parameters:**
    - **file**: CSV file to upload
    - **account_id**: Target bank account (must exist or create first via POST /accounts)
    """
    # Validate file format
    if file.filename and not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid file format. Only CSV files are supported."
        )
    
    # Verify account exists
    account = db.query(BankAccount).filter(BankAccount.account_id == account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Bank account '{account_id}' not found. Create it first via POST /accounts"
        )
    
    if not account.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Account '{account_id}' is inactive"
        )
    
    try:
        contents = await file.read()
        decoded_contents = contents.decode("utf-8")
        
        # Pass account info to parser
        result = StatementParserService.process_csv(
            decoded_contents, 
            db,
            account_id=account_id,
            bank_profile=account.bank_profile
        )
        return {
            "status": "success",
            "account_id": account_id,
            "summary": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while handling the file: {str(e)}"
        )