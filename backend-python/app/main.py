# backend-python/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Setup logging
from app.core.logging_config import setup_logging
setup_logging()

import logging
logger = logging.getLogger("sigmaspend")

from app.core.config import settings
from app.database.session import SessionLocal, engine, Base
from app.database.seeder import seed_database_if_empty
from app.api.endpoints import ingestion, expenses, categories, rules
# Import models to ensure they're registered with Base.metadata
from app.models.bank_account import BankAccount
from app.models.expense import Expense
from app.models.category import Category
from app.models.category_rules import CategoryRule


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

@app.get("/")
def read_root():
    return {"message": "Welcome to the SigmaSpend Backend API. Visit /docs for OpenAPI specs."}

# Bind router endpoints
app.include_router(ingestion.router, prefix=settings.API_V1_STR, tags=["Ingestion Module"])
app.include_router(expenses.router, prefix=f"{settings.API_V1_STR}/expenses", tags=["Expenses Module"])
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(rules.router, prefix=f"{settings.API_V1_STR}/rules", tags=["Rules Engine"])