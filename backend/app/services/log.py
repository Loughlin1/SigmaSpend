import json
import os
from datetime import datetime, timezone
from typing import Optional, List

from app.core.logging_config import get_log_file
from app.exceptions import InternalError


def iter_log_lines(log_file: str) -> List[dict]:
    """Return parsed log entries from a JSON log file, newest first."""
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
                lines.append({"timestamp": None, "level": "UNKNOWN", "module": "unknown", "message": raw})

    lines.reverse()
    return lines


class LogService:
    @staticmethod
    def get_entries(
        level: Optional[str] = None,
        module: Optional[str] = None,
        since: Optional[datetime] = None,
        limit: int = 200,
    ) -> List[dict]:
        try:
            entries = iter_log_lines(get_log_file())
        except OSError as e:
            raise InternalError(f"Could not read log file: {e}")

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

        return entries[:limit]

    @staticmethod
    def get_modules() -> List[str]:
        try:
            entries = iter_log_lines(get_log_file())
        except OSError as e:
            raise InternalError(f"Could not read log file: {e}")
        return sorted({e.get("module", "") for e in entries if e.get("module")})
