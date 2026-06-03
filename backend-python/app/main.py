from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine, Base
from app.api.endpoints import ingestion, expenses

# Bootstraps local tables on initialization if they are missing
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

# Setup CORS policies so your local React app (Port 5173) can query this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bind router endpoints
app.include_router(ingestion.router, prefix=settings.API_V1_STR, tags=["Ingestion Module"])
app.include_router(expenses.router, prefix=settings.API_V1_STR, tags=["Expenses Module"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the SigmaSpend Backend API. Visit /docs for OpenAPI specs."}