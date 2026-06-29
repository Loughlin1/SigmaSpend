# backend/app/main.py
import logging
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Setup logging
from app.core.logging_config import setup_logging
setup_logging()

logger = logging.getLogger("sigmaspend")

from app.core.config import settings
from app.exceptions import NotFoundError, BadRequestError, ConflictError, InternalError
from app.middleware import register_middleware
from app.api.deps import require_api_key
from app.database.session import SessionLocal, engine, Base
from app.database.seeder import seed_database_if_empty
from app.api.endpoints import upload, expenses, categories, rules, accounts, banks, logs, budgets, income, bucket_budgets, holidays, backup
from app.services.backup import run_backup
# Import models to ensure they're registered with Base.metadata
from app.models.bank_account import BankAccount
from app.models.expense import Expense
from app.models.category import Category
from app.models.category_rules import CategoryRule
from app.models.budget import Budget
from app.models.bucket_budget import BucketBudget
from app.models.income_settings import IncomeSettings
from app.models.holiday import Holiday


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Sequence:
    logger.info("[Startup] Initialising database tables...")

    # 1. Enforce physical creation of the .db file and tables if missing
    Base.metadata.create_all(bind=engine)

    # 2. Open a transient lifecycle context session block to run the seed checks
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
    finally:
        db.close()

    # 3. Start scheduled database backups (daily at 02:00)
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        lambda: run_backup(settings.DATABASE_URL),
        trigger=CronTrigger(hour=2, minute=0),
        id="daily_db_backup",
        name="Daily SQLite backup",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("[Startup] Backup scheduler started — daily at 02:00.")

    yield

    # Shutdown Sequence
    scheduler.shutdown(wait=False)
    logger.info("[Shutdown] Backup scheduler stopped.")

_docs_url = None if settings.APP_ENV == "production" else "/docs"
_redoc_url = None if settings.APP_ENV == "production" else "/redoc"

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    docs_url=_docs_url,
    redoc_url=_redoc_url,
)

register_middleware(app)


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(status_code=404, content={"detail": exc.detail})


@app.exception_handler(BadRequestError)
async def bad_request_handler(request: Request, exc: BadRequestError):
    return JSONResponse(status_code=400, content={"detail": exc.detail})


@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError):
    return JSONResponse(status_code=409, content={"detail": exc.detail})


@app.exception_handler(InternalError)
async def internal_error_handler(request: Request, exc: InternalError):
    logger.error(f"Internal error on {request.method} {request.url.path}: {exc.detail}")
    return JSONResponse(status_code=500, content={"detail": "An internal error occurred. Please try again later."})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Catches all framework-level Pydantic validation errors, 
    extracts the exact failing field context, and forces it into the application log stream.
    """
    error_details = exc.errors()
    
    # Format a highly human-readable tracking block for the terminal stdout
    log_msg = [
        f"❌ Pydantic Schema Validation Failed on route: {request.method} {request.url.path}"
    ]
    
    for error in error_details:
        # Loc represents the path to the problematic field (e.g., ['body', 'keyword'])
        field_path = " -> ".join(str(loc) for loc in error.get("loc", []))
        error_msg = error.get("msg", "Unknown error")
        error_type = error.get("type", "unknown_type")
        
        log_msg.append(f"  • Field Error [{field_path}]: {error_msg} ({error_type})")
        
    # Commit the clean stacked trace to your system logger
    logger.error("\n".join(log_msg))
    
    # Return standard JSON format payload back to the React UI client
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": error_details},
    )

@app.get("/")
def read_root():
    return {"message": "Welcome to the SigmaSpend Backend API. Visit /docs for OpenAPI specs."}

# Bind router endpoints — all routes require a valid X-API-Key header
_auth = {"dependencies": [Depends(require_api_key)]}

app.include_router(upload.router, prefix=f"{settings.API_V1_STR}/upload", tags=["Upload"], **_auth)
app.include_router(accounts.router, prefix=f"{settings.API_V1_STR}/accounts", tags=["Accounts Module"], **_auth)
app.include_router(expenses.router, prefix=f"{settings.API_V1_STR}/expenses", tags=["Expenses Module"], **_auth)
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"], **_auth)
app.include_router(rules.router, prefix=f"{settings.API_V1_STR}/rules", tags=["Rules Engine"], **_auth)
app.include_router(banks.router, prefix=f"{settings.API_V1_STR}/banks", tags=["Banks"], **_auth)
app.include_router(logs.router, prefix=settings.API_V1_STR, tags=["Logs"], **_auth)
app.include_router(budgets.router, prefix=f"{settings.API_V1_STR}/budgets", tags=["Budgets"], **_auth)
app.include_router(bucket_budgets.router, prefix=f"{settings.API_V1_STR}/bucket-budgets", tags=["Bucket Budgets"], **_auth)
app.include_router(income.router, prefix=f"{settings.API_V1_STR}/income", tags=["Income"], **_auth)
app.include_router(holidays.router, prefix=f"{settings.API_V1_STR}/holidays", tags=["Holidays"], **_auth)
app.include_router(backup.router, prefix=f"{settings.API_V1_STR}/backup", tags=["Backup"], **_auth)