import json
import logging
import logging.handlers
import os
from datetime import datetime, timezone

LOG_DIR = os.getenv("LOG_DIR", "logs")
LOG_FORMAT = os.getenv("LOG_FORMAT", "json")  # "json" or "plain"
LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG")
LOG_FILE = os.path.join(LOG_DIR, "sigmaspend.log")

MODULE_LOG_LEVELS: dict[str, str] = {
    "pdf_parser": os.getenv("LOG_LEVEL_PDF_PARSER", "DEBUG"),
    "parser": os.getenv("LOG_LEVEL_PARSER", "DEBUG"),
    "classifier": os.getenv("LOG_LEVEL_CLASSIFIER", "INFO"),
    "expenses": os.getenv("LOG_LEVEL_EXPENSES", "INFO"),
    "ingestion": os.getenv("LOG_LEVEL_INGESTION", "INFO"),
    "analytics": os.getenv("LOG_LEVEL_ANALYTICS", "INFO"),
}


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
    os.makedirs(LOG_DIR, exist_ok=True)

    root_level = getattr(logging, LOG_LEVEL.upper(), logging.DEBUG)

    if LOG_FORMAT == "json":
        formatter: logging.Formatter = JsonFormatter()
    else:
        formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s")

    file_handler = logging.handlers.RotatingFileHandler(
        LOG_FILE,
        maxBytes=5 * 1024 * 1024,  # 5 MB per file
        backupCount=3,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s - %(message)s")
    )

    logging.basicConfig(level=root_level, handlers=[console_handler, file_handler])

    # Per-module overrides
    for module, level_str in MODULE_LOG_LEVELS.items():
        level = getattr(logging, level_str.upper(), root_level)
        logging.getLogger(f"sigmaspend.{module}").setLevel(level)

    # Suppress noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("python_multipart").setLevel(logging.INFO)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("pdfminer").setLevel(logging.WARNING)
