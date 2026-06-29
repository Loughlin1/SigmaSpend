# app/api/endpoints/backup.py
from fastapi import APIRouter
from app.core.config import settings
from app.services.backup import run_backup, list_backups

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.post("/trigger")
def trigger_backup():
    """Manually trigger a database backup."""
    path = run_backup(settings.DATABASE_URL)
    return {"message": "Backup created successfully.", "path": path}


@router.get("/list")
def get_backups():
    """List all available backup files."""
    return list_backups(settings.DATABASE_URL)
