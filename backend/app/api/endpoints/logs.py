from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query

from app.services.log import LogService

router = APIRouter()


@router.get("/logs")
def get_logs(
    level: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    since: Optional[datetime] = Query(None),
    limit: int = Query(200, ge=1, le=2000),
):
    entries = LogService.get_entries(level=level, module=module, since=since, limit=limit)
    return {
        "total": len(entries),
        "filters": {"level": level, "module": module, "since": since, "limit": limit},
        "entries": entries,
    }


@router.get("/logs/levels")
def get_log_levels():
    return {"levels": ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]}


@router.get("/logs/modules")
def get_log_modules():
    return {"modules": LogService.get_modules()}
