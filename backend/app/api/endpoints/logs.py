import json
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.logging_config import get_log_file

router = APIRouter()


def _iter_log_lines(log_file: str):
    """Yield parsed log entries from a JSON log file, newest first."""
    if not os.path.exists(log_file):
        return []

    lines = []
    with open(log_file, encoding="utf-8") as f:
        for raw in f:
            raw = raw.strip()
            if not raw:
                continue
            try:
                lines.append(json.loads(raw))
            except json.JSONDecodeError:
                # Fall back to plain-text entry so plain-format logs still work
                lines.append({"timestamp": None, "level": "UNKNOWN", "module": "unknown", "message": raw})

    lines.reverse()
    return lines


@router.get("/logs")
def get_logs(
    level: Optional[str] = Query(None, description="Filter by log level (DEBUG, INFO, WARNING, ERROR)"),
    module: Optional[str] = Query(None, description="Filter by module name (partial match)"),
    since: Optional[datetime] = Query(None, description="Return entries after this ISO timestamp"),
    limit: int = Query(200, ge=1, le=2000, description="Max number of entries to return"),
):
    """
    Return recent log entries with optional filtering.
    Query params: level, module (partial), since (ISO datetime), limit.
    """
    try:
        entries = _iter_log_lines(get_log_file())
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"Could not read log file: {e}")

    if level:
        level_upper = level.upper()
        entries = [e for e in entries if e.get("level", "").upper() == level_upper]

    if module:
        module_lower = module.lower()
        entries = [e for e in entries if module_lower in e.get("module", "").lower()]

    if since:
        since_utc = since.replace(tzinfo=timezone.utc) if since.tzinfo is None else since
        filtered = []
        for e in entries:
            ts = e.get("timestamp")
            if ts:
                try:
                    entry_dt = datetime.fromisoformat(ts)
                    if entry_dt >= since_utc:
                        filtered.append(e)
                except ValueError:
                    pass
        entries = filtered

    entries = entries[:limit]

    return {
        "total": len(entries),
        "filters": {"level": level, "module": module, "since": since, "limit": limit},
        "entries": entries,
    }


@router.get("/logs/levels")
def get_log_levels():
    """Return the available log levels for use as filter values."""
    return {"levels": ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]}


@router.get("/logs/modules")
def get_log_modules():
    """Return the distinct module names seen in the current log file."""
    try:
        entries = _iter_log_lines(get_log_file())
    except OSError:
        return {"modules": []}

    modules = sorted({e.get("module", "") for e in entries if e.get("module")})
    return {"modules": modules}
