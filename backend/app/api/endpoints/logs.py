from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.log import LogService

router = APIRouter()


@router.get("/logs")
def get_logs(
    level: Optional[str] = Query(None, description="Filter by log level (DEBUG, INFO, WARNING, ERROR)"),
    module: Optional[str] = Query(None, description="Filter by module name (partial match)"),
    since: Optional[datetime] = Query(None, description="Return entries after this ISO timestamp"),
    limit: int = Query(200, ge=1, le=2000, description="Max number of entries to return"),
):
    try:
        entries = LogService.get_entries(level=level, module=module, since=since, limit=limit)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not read log file: {e}")

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
    try:
        modules = LogService.get_modules()
    except OSError:
        return {"modules": []}
    return {"modules": modules}
