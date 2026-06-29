import os
from typing import List, Literal
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "SigmaSpend API"
    API_V1_STR: str = "/api/v1"
    APP_ENV: Literal["development", "production", "test"] = "development"

    DATABASE_URL: str = "sqlite:///./dev_data/sigmaspend_dev.db"

    # API key — set a strong random value in .env.production
    API_KEY: str = "dev-insecure-key"

    # CORS — comma-separated list of allowed origins
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5174"]

    # Logging — LOG_FORMAT controls console output only; file is always JSON
    LOG_FORMAT: str = "json"
    LOG_LEVEL: str = "DEBUG"
    LOG_DIR: str = "logs"
    LOG_LEVEL_PDF_PARSER: str = "DEBUG"
    LOG_LEVEL_PARSER: str = "DEBUG"
    LOG_LEVEL_CLASSIFIER: str = "INFO"
    LOG_LEVEL_EXPENSES: str = "INFO"
    LOG_LEVEL_INGESTION: str = "INFO"
    LOG_LEVEL_ANALYTICS: str = "INFO"

    # File upload — max size per file in bytes (default 20 MB)
    MAX_UPLOAD_BYTES: int = 20 * 1024 * 1024

    class Config:
        case_sensitive = True
        env_file = f".env.{os.getenv('APP_ENV', 'development')}"


settings = Settings()
