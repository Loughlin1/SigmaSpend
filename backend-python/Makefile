# Define core directory paths and configurations
PYTHON := .venv/bin/python
PIP := .venv/bin/pip
UVICORN := .venv/bin/uvicorn
PYTEST := .venv/bin/pytest

.PHONY: help venv install run test clean db-reset

# Default target when simply running `make`
help:
	@echo "======================================================================"
	@echo "                       SIGMASPEND AUTOMATION ENGINE                   "
	@echo "======================================================================"
	@echo "Available commands:"
	@echo "  make venv       - Create a local Python virtual environment"
	@echo "  make install    - Install project dependencies from requirements.txt"
	@echo "  make run        - Spin up the local FastAPI development server"
	@echo "  make test       - Execute the Pytest suite with verbose formatting"
	@echo "  make clean      - Remove build files, python cache, and test metrics"
	@echo "  make db-reset   - Purge SQLite file to force database re-seeding"
	@echo "======================================================================"

# Target to create the virtual environment if it doesn't exist
venv:
	@echo "[Setup] Creating Python virtual environment..."
	python3 -m venv venv
	@echo "[Setup] Virtual environment active at ./venv/"

# Target to install dependencies
install: venv
	@echo "[Install] Updating pip and synchronising dependencies..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@echo "[Install] Project environment setup completed successfully."

# Target to run the API development server
run:
	@echo "[Runtime] Launching SigmaSpend FastAPI Core Server..."
	$(UVICORN) app.main:app --host 127.0.0.1 --port 8000 --reload

# Target to execute unit and endpoint tests
test:
	@echo "[Testing] Initialising Pytest suite..."
	$(PYTHON) -m pytest -v --tb=short

# Target to purge application caching properties
clean:
	@echo "[Clean] Erasing temporary operational cache directories..."
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	@echo "[Clean] Directory cache wiped cleanly."

# Target to drop the SQLite file to force an immediate database re-seed on next boot
db-reset:
	@echo "[Database] Purging local SQLite database cache..."
	rm -f sigmaspend.db
	@echo "[Database] DB file cleared. Next server launch will build and seed new data."