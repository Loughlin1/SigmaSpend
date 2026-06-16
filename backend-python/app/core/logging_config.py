# backend-python/app/core/logging_config.py
import logging

def setup_logging():
    """Initializes the global logging configuration for the FastAPI application."""
    logging.basicConfig(
        level=logging.DEBUG,  # Set to DEBUG for local troubleshooting
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
        handlers=[
            logging.StreamHandler(),          # Print to console
            logging.FileHandler("debug.log")  # Write to a local file for persistent review
        ]
    )
    # Prevent third-party libraries (like uvicorn or multipart) from flooding your logs with DEBUG noise
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)