# Define core directory paths and configurations
PYTHON := .venv/bin/python
PIP := .venv/bin/pip
UVICORN := .venv/bin/uvicorn
PYTEST := .venv/bin/pytest
ALEMBIC := .venv/bin/alembic

.PHONY: help venv install run-dev run-prod migrate-dev migrate-prod test clean db-reset-dev db-reset-prod

# Default target when simply running `make`
help:
	@echo "======================================================================"
	@echo "                       SIGMASPEND AUTOMATION ENGINE                   "
	@echo "======================================================================"
	@echo "Setup & Installation:"
	@echo "  make venv           - Create a local Python virtual environment"
	@echo "  make install        - Install project dependencies from requirements.txt"
	@echo ""
	@echo "Development Environment (Safe Playground):"
	@echo "  make run-dev        - Spin up FastAPI with live reload (.env.development)"
	@echo "  make migrate-dev    - Apply Alembic migrations to development DB"
	@echo "  make db-reset-dev   - Purge local development SQLite database file"
	@echo ""
	@echo "Production Environment (Confidential Live Data):"
	@echo "  make run-prod       - Spin up FastAPI in optimized production mode"
	@echo "  make migrate-prod   - Securely apply migrations to production DB"
	@echo "  make db-reset-prod  - Purge production database file (Handle with care)"
	@echo ""
	@echo "Testing & Utility Tools:"
	@echo "  make test           - Run the isolated unit testing suite via Pytest"
	@echo "  make clean          - Remove build files, python cache, and test metrics"
	@echo "======================================================================"

# Target to create the virtual environment if it doesn't exist
venv:
	@echo "[Setup] Creating Python virtual environment..."
	python3 -m venv .venv
	@echo "[Setup] Virtual environment active at ./venv/"

# Target to install dependencies
install: venv
	@echo "[Install] Updating pip and synchronising dependencies..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@echo "[Install] Project environment setup completed successfully."

# ============================================================================
# Development Targets
# ============================================================================

run-dev:
	@echo "[Runtime] Launching SigmaSpend FastAPI Core Server [DEVELOPMENT]..."
	APP_ENV=development $(UVICORN) app.main:app --host 127.0.0.1 --port 8000 --reload

migrate-dev:
	@echo "[Migration] Running database upgrades [DEVELOPMENT]..."
	APP_ENV=development $(ALEMBIC) upgrade head

db-reset-dev:
	@echo "[Database] Purging development SQLite database cache..."
	rm -rf ./dev_data/sigmaspend_dev.db
	@echo "[Database] Development DB cleared cleanly."

# ============================================================================
# Production Targets
# ============================================================================

run-prod:
	@echo "[Runtime] Launching SigmaSpend FastAPI Core Server [PRODUCTION]..."
	# Dropped --reload flag for deployment resource optimization
	APP_ENV=production $(UVICORN) app.main:app --host 127.0.0.1 --port 8000

migrate-prod:
	@echo "[Migration] Running secure database upgrades [PRODUCTION]..."
	APP_ENV=production $(ALEMBIC) upgrade head

db-reset-prod:
	@echo "[Database] WARNING: Purging production database containing confidential data..."
	# Cleans absolute path safely outside code repository matching your secure folder layout
	rm -f /Users/loughlindavidson/SecureDocuments/SigmaSpend/sigmaspend_prod.db
	@echo "[Database] Production DB file removed cleanly."

# ============================================================================
# Core Utility Targets
# ============================================================================

# Target to execute unit and endpoint tests (Forces isolated APP_ENV context)
test:
	@echo "[Testing] Initialising Pytest suite..."
	APP_ENV=development $(PYTHON) -m pytest -v --tb=short

# Target to purge application caching properties
clean:
	@echo "[Clean] Erasing temporary operational cache directories..."
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.log" -delete 
	@echo "[Clean] Directory cache and log history wiped cleanly."