# backend-python/app/main.py
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Setup logging
from app.core.logging_config import setup_logging
setup_logging()

logger = logging.getLogger("sigmaspend")

from app.core.config import settings
from app.database.session import SessionLocal, engine, Base
from app.database.seeder import seed_database_if_empty
from app.api.endpoints import ingestion, expenses, categories, rules, accounts, banks, logs, budgets, income
# Import models to ensure they're registered with Base.metadata
from app.models.bank_account import BankAccount
from app.models.expense import Expense
from app.models.category import Category
from app.models.category_rules import CategoryRule
from app.models.budget import Budget
from app.models.income_settings import IncomeSettings


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
        
    yield
    # Shutdown Sequence (if any) can go here

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Setup CORS policies so your local React app (Port 5173) can query this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_incoming_requests(request: Request, call_next):
    """
    Global interceptor that logs every incoming API request details
    and records its exact execution time.
    """
    start_time = time.time()
    
    # Extract request metadata
    method = request.method
    path = request.url.path
    client_host = request.client.host if request.client else "unknown"
    
    # Log the incoming call step
    logger.info(f"📥 Incoming: {method} {path} | Client IP: {client_host}")
    
    # Process the request down the router chain
    try:
        response = await call_next(request)
        
        # Calculate execution latency
        process_time = (time.time() - start_time) * 1000
        
        # Log completion with tracking status code
        status_code = response.status_code
        log_msg = f"📤 Response: {method} {path} -> Status: {status_code} | Latency: {process_time:.2f}ms"
        
        # Colour-code or flag warning alerts in your console stream based on status
        if status_code >= 400:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)
            
        return response
        
    except Exception as e:
        # Catch unexpected pipeline crashes safely
        process_time = (time.time() - start_time) * 1000
        logger.error(f"💥 Pipeline Crash: {method} {path} failed after {process_time:.2f}ms | Error: {str(e)}")
        raise e

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

# Bind router endpoints
app.include_router(ingestion.router, prefix=settings.API_V1_STR, tags=["Ingestion Module"])
app.include_router(accounts.router, prefix=f"{settings.API_V1_STR}/accounts", tags=["Accounts Module"])
app.include_router(expenses.router, prefix=f"{settings.API_V1_STR}/expenses", tags=["Expenses Module"])
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(rules.router, prefix=f"{settings.API_V1_STR}/rules", tags=["Rules Engine"])
app.include_router(banks.router, prefix=f"{settings.API_V1_STR}/banks", tags=["Banks"])
app.include_router(logs.router, prefix=settings.API_V1_STR, tags=["Logs"])
app.include_router(budgets.router, prefix=f"{settings.API_V1_STR}/budgets", tags=["Budgets"])
app.include_router(income.router, prefix=f"{settings.API_V1_STR}/income", tags=["Income"])