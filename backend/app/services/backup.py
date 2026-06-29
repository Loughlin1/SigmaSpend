# app/services/backup.py
import sqlite3
import os
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict

logger = logging.getLogger("sigmaspend")


def get_db_path(database_url: str) -> str:
    """Extract filesystem path from a sqlite:/// URL."""
    return database_url.replace("sqlite:///", "")


def get_backup_dir(db_path: str) -> Path:
    """Backup directory sits alongside the database file."""
    return Path(db_path).parent / "backups"


def run_backup(database_url: str, keep: int = 30) -> str:
    """
    Copy the live SQLite database using the built-in backup API (safe during writes).
    Prunes oldest backups so only `keep` copies are retained.
    Returns the path of the new backup file.
    """
    db_path = get_db_path(database_url)
    backup_dir = get_backup_dir(db_path)
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    db_name = Path(db_path).stem  # e.g. "sigmaspend_prod"
    dest = backup_dir / f"{db_name}_backup_{timestamp}.db"

    src_conn = sqlite3.connect(db_path)
    bak_conn = sqlite3.connect(str(dest))
    try:
        src_conn.backup(bak_conn)
        logger.info(f"[Backup] Created: {dest}")
    finally:
        bak_conn.close()
        src_conn.close()

    # Prune: keep the N most recent, delete the rest
    existing = sorted(backup_dir.glob(f"{db_name}_backup_*.db"), key=os.path.getmtime, reverse=True)
    for old in existing[keep:]:
        old.unlink()
        logger.info(f"[Backup] Pruned old backup: {old}")

    return str(dest)


def list_backups(database_url: str) -> List[Dict]:
    """Return metadata for all backup files, newest first."""
    db_path = get_db_path(database_url)
    backup_dir = get_backup_dir(db_path)
    if not backup_dir.exists():
        return []

    db_name = Path(db_path).stem
    files = sorted(backup_dir.glob(f"{db_name}_backup_*.db"), key=os.path.getmtime, reverse=True)
    return [
        {
            "filename": f.name,
            "path": str(f),
            "size_kb": round(f.stat().st_size / 1024, 1),
            "created_at": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
        }
        for f in files
    ]
