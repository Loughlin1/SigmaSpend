"""Unit tests for the backup service (run_backup / list_backups)."""
import os
import sqlite3
import tempfile
import time
from pathlib import Path

import pytest

from app.services.backup import run_backup, list_backups, get_db_path, get_backup_dir


def _make_sqlite_db(directory: str, name: str = "test_db.db") -> str:
    """Create a minimal SQLite database file and return its path."""
    db_path = os.path.join(directory, name)
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE dummy (id INTEGER PRIMARY KEY)")
    conn.commit()
    conn.close()
    return db_path


class TestGetDbPath:
    def test_strips_sqlite_prefix(self):
        assert get_db_path("sqlite:///./data/mydb.db") == "./data/mydb.db"

    def test_absolute_path(self):
        assert get_db_path("sqlite:////abs/path/db.db") == "/abs/path/db.db"


class TestGetBackupDir:
    def test_backup_dir_is_sibling_of_db(self):
        result = get_backup_dir("/data/prod/mydb.db")
        assert result == Path("/data/prod/backups")


class TestRunBackup:
    def test_creates_backup_file(self, tmp_path):
        """run_backup creates a .db file in the backups/ subdirectory."""
        db_path = _make_sqlite_db(str(tmp_path))
        url = f"sqlite:///{db_path}"

        backup_path = run_backup(url)

        assert os.path.exists(backup_path)
        assert backup_path.endswith(".db")

    def test_backup_is_valid_sqlite(self, tmp_path):
        """The created backup can be opened as a valid SQLite database."""
        db_path = _make_sqlite_db(str(tmp_path))
        backup_path = run_backup(f"sqlite:///{db_path}")

        conn = sqlite3.connect(backup_path)
        tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        conn.close()
        assert any("dummy" in row[0] for row in tables)

    def test_backup_path_contains_db_stem(self, tmp_path):
        """Backup filename includes the original database name."""
        db_path = _make_sqlite_db(str(tmp_path), name="sigmaspend_prod.db")
        backup_path = run_backup(f"sqlite:///{db_path}")

        assert "sigmaspend_prod" in os.path.basename(backup_path)

    def test_returns_string_path(self, tmp_path):
        """run_backup returns a string (not a Path object)."""
        db_path = _make_sqlite_db(str(tmp_path))
        result = run_backup(f"sqlite:///{db_path}")
        assert isinstance(result, str)

    def test_prunes_old_backups(self, tmp_path):
        """When keep=2, only the 2 newest backups are retained."""
        import datetime as dt
        from unittest.mock import patch

        db_path = _make_sqlite_db(str(tmp_path))
        url = f"sqlite:///{db_path}"

        timestamps = [
            dt.datetime(2024, 1, 1, 0, 0, 1),
            dt.datetime(2024, 1, 1, 0, 0, 2),
            dt.datetime(2024, 1, 1, 0, 0, 3),
        ]

        for ts in timestamps:
            with patch("app.services.backup.datetime") as mock_dt:
                mock_dt.now.return_value = ts
                mock_dt.fromtimestamp = dt.datetime.fromtimestamp
                run_backup(url, keep=2)

        backup_dir = Path(db_path).parent / "backups"
        remaining = list(backup_dir.glob("*.db"))
        assert len(remaining) == 2


class TestListBackups:
    def test_returns_empty_when_no_backup_dir(self, tmp_path):
        """list_backups returns [] when the backup directory doesn't exist."""
        db_path = os.path.join(str(tmp_path), "nobackups.db")
        open(db_path, "wb").close()
        result = list_backups(f"sqlite:///{db_path}")
        assert result == []

    def test_lists_backups_newest_first(self, tmp_path):
        """Backups are returned in reverse-mtime order (newest first)."""
        import datetime as dt
        from unittest.mock import patch

        db_path = _make_sqlite_db(str(tmp_path))
        url = f"sqlite:///{db_path}"

        timestamps = [
            dt.datetime(2024, 1, 1, 0, 0, 1),
            dt.datetime(2024, 1, 1, 0, 0, 2),
            dt.datetime(2024, 1, 1, 0, 0, 3),
        ]

        for ts in timestamps:
            with patch("app.services.backup.datetime") as mock_dt:
                mock_dt.now.return_value = ts
                mock_dt.fromtimestamp = dt.datetime.fromtimestamp
                run_backup(url)

        result = list_backups(url)
        assert len(result) == 3
        # Timestamps should be descending (newest first)
        timestamps_out = [r["created_at"] for r in result]
        assert timestamps_out == sorted(timestamps_out, reverse=True)

    def test_backup_metadata_fields(self, tmp_path):
        """Each backup entry has filename, path, size_kb, and created_at."""
        db_path = _make_sqlite_db(str(tmp_path))
        run_backup(f"sqlite:///{db_path}")

        result = list_backups(f"sqlite:///{db_path}")
        assert len(result) == 1
        entry = result[0]
        assert "filename" in entry
        assert "path" in entry
        assert "size_kb" in entry
        assert "created_at" in entry
        assert entry["filename"].endswith(".db")
        assert entry["size_kb"] >= 0
