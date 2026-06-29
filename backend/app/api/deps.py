from typing import Generator

from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader

from app.core.config import settings
from app.database.session import SessionLocal

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(api_key: str = Security(_api_key_header)) -> None:
    if not api_key or api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )


def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()
