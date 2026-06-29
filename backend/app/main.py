# backend/app/main.py
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
from app.api.endpoints import ingestion, expenses, categories, rules, accounts, banks, logs, budgets, income, bucket_budgets, holidays, backup
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
async def log_requests_and_responses(request: Request, call_next):
    """
    Global interceptor that logs every request and response with payloads:
    - Incoming: body for POST/PUT/PATCH, query params for GET/DELETE
    - Outgoing: response body (buffered and reconstructed so the client still receives it)
    """
    import json as _json
    from starlette.responses import Response as StarletteResponse

    start_time = time.time()
    method = request.method
    path = request.url.path
    client_host = request.client.host if request.client else "unknown"

    # Skip logging for log-viewer requests to avoid a self-referential feedback loop
    if path.startswith(f"{settings.API_V1_STR}/logs"):
        return await call_next(request)

    # Payload size cap: truncate anything larger than 8 KB to keep log entries small
    MAX_PAYLOAD_BYTES = 8 * 1024

    def _truncate(raw: bytes) -> object:
        if len(raw) > MAX_PAYLOAD_BYTES:
            preview = raw[:MAX_PAYLOAD_BYTES].decode("utf-8", errors="replace")
            return {"_truncated": True, "preview": preview, "original_bytes": len(raw)}
        try:
            return _json.loads(raw)
        except _json.JSONDecodeError:
            return raw.decode("utf-8", errors="replace")

    # --- Capture incoming payload ---
    request_payload = None
    if method in ("POST", "PUT", "PATCH"):
        body_bytes = await request.body()
        if body_bytes:
            request_payload = _truncate(body_bytes)

        async def _replay_receive():
            return {"type": "http.request", "body": body_bytes, "more_body": False}
        request = Request(request.scope, _replay_receive)

    elif method in ("GET", "DELETE"):
        params = dict(request.query_params)
        if params:
            request_payload = params

    http_extra = {"http_method": method, "http_path": path}

    logger.info(
        f"📥 Incoming: {method} {path} | Client IP: {client_host}",
        extra={"payload": request_payload, **http_extra},
    )

    # --- Call the route handler ---
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        status_code = response.status_code

        # Buffer the response body so we can log it, then reconstruct
        response_body = b""
        async for chunk in response.body_iterator:
            response_body += chunk

        # Only log response payloads for mutations and errors — GET responses
        # can be large lists that inflate the log file significantly
        response_payload = None
        is_mutation = method in ("POST", "PUT", "PATCH", "DELETE")
        is_error = status_code >= 400
        content_type = response.headers.get("content-type", "")
        if (is_mutation or is_error) and "application/json" in content_type and response_body:
            response_payload = _truncate(response_body)

        log_msg = f"📤 Response: {method} {path} -> Status: {status_code} | Latency: {process_time:.2f}ms"
        log_level = logger.warning if status_code >= 400 else logger.info
        log_level(log_msg, extra={"payload": response_payload, **http_extra})

        return StarletteResponse(
            content=response_body,
            status_code=status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )

    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        logger.error(
            f"💥 Pipeline Crash: {method} {path} failed after {process_time:.2f}ms | Error: {str(e)}",
            extra={"payload": request_payload, **http_extra},
        )
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
app.include_router(bucket_budgets.router, prefix=f"{settings.API_V1_STR}/bucket-budgets", tags=["Bucket Budgets"])
app.include_router(income.router, prefix=f"{settings.API_V1_STR}/income", tags=["Income"])
app.include_router(holidays.router, prefix=f"{settings.API_V1_STR}/holidays", tags=["Holidays"])
app.include_router(backup.router, prefix=f"{settings.API_V1_STR}/backup", tags=["Backup"])