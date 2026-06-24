import json
import logging
import logging.handlers
import os
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "module": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


def setup_logging() -> None:
    # Import here to avoid circular import (main.py calls setup_logging before settings is used elsewhere)
    from app.core.config import settings

    os.makedirs(settings.LOG_DIR, exist_ok=True)
    log_file = os.path.join(settings.LOG_DIR, "sigmaspend.log")

    root_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.DEBUG)

    # File always uses JSON so the /logs endpoint can parse structured fields.
    # LOG_FORMAT=plain only affects the console handler.
    file_formatter: logging.Formatter = JsonFormatter()

    file_handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(file_formatter)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s")
    )

    logging.basicConfig(level=root_level, handlers=[console_handler, file_handler])

    module_overrides = {
        "pdf_parser": settings.LOG_LEVEL_PDF_PARSER,
        "parser": settings.LOG_LEVEL_PARSER,
        "classifier": settings.LOG_LEVEL_CLASSIFIER,
        "expenses": settings.LOG_LEVEL_EXPENSES,
        "ingestion": settings.LOG_LEVEL_INGESTION,
        "analytics": settings.LOG_LEVEL_ANALYTICS,
    }
    for module, level_str in module_overrides.items():
        logging.getLogger(f"sigmaspend.{module}").setLevel(
            getattr(logging, level_str.upper(), root_level)
        )

    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("python_multipart").setLevel(logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("pdfminer").setLevel(logging.WARNING)


def get_log_file() -> str:
    from app.core.config import settings
    return os.path.join(settings.LOG_DIR, "sigmaspend.log")
