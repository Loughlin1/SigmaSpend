# app/api/endpoints/backup.py
from pathlib import Path

from fastapi import APIRouter

from app.core.config import settings
from app.services.backup import run_backup, list_backups

import logging
logger = logging.getLogger("sigmaspend")

router = APIRouter()


@router.post("/trigger")
def trigger_backup():
    path = run_backup(settings.DATABASE_URL)
    return {"message": "Backup created successfully.", "filename": Path(path).name}


@router.get("/list")
def get_backups():
    backups = list_backups(settings.DATABASE_URL)
    # Strip server-side filesystem paths before returning to the client
    return [
        {k: v for k, v in b.items() if k != "path"}
        for b in backups
    ]
