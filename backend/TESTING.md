# Testing Guide for SigmaSpend Backend

This guide explains how to run tests for the SigmaSpend Python backend.

## Setup

1. **Install test dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Verify pytest is installed:**
   ```bash
   pytest --version
   ```

## Running Tests

### Run all tests:
```bash
pytest
```

### Run tests with verbose output:
```bash
pytest -v
```

### Run a specific test file:
```bash
pytest tests/test_models.py
```

### Run a specific test class:
```bash
pytest tests/test_models.py::TestExpenseModel
```

### Run a specific test:
```bash
pytest tests/test_models.py::TestExpenseModel::test_expense_model_creation
```

### Run tests matching a pattern:
```bash
pytest -k "test_expense"
```

## Test Coverage

Generate a coverage report:
```bash
pytest --cov=app --cov-report=html
```

This generates an HTML coverage report in the `htmlcov/` directory. Open `htmlcov/index.html` in a browser to view detailed coverage metrics.

View coverage in the terminal:
```bash
pytest --cov=app --cov-report=term-missing
```

## Test Structure

### `tests/conftest.py`
Shared pytest fixtures for:
- Database session management
- FastAPI test client
- Sample configuration and CSV data

### `tests/test_models.py`
Tests for SQLAlchemy models:
- Expense model creation and attributes
- Default values
- Database constraints (unique transaction hash)
- Querying by various fields

### `tests/test_services.py`
Tests for business logic:
- `StatementParserService.generate_transaction_hash()` - hash generation and determinism
- `StatementParserService.load_bank_config()` - configuration loading and error handling
- `StatementParserService.process_csv()` - CSV parsing, duplicate detection, and transaction normalization

### `tests/test_endpoints.py`
Tests for API endpoints:
- Root endpoint
- CSV upload endpoint with various scenarios (success, invalid formats, empty files, malformed data)
- CORS configuration
- API documentation endpoints

### `tests/test_config.py`
Tests for application settings:
- Configuration values
- Type validation

## Best Practices

1. **Run tests before committing:**
   ```bash
   pytest -v
   ```

2. **Check coverage regularly:**
   ```bash
   pytest --cov=app --cov-report=term-missing
   ```

3. **Use markers for selective test runs:**
   ```bash
   pytest -m "not slow"  # Skip slow tests
   ```

4. **Keep tests focused:** Each test should test one specific behavior

5. **Use fixtures:** Leverage fixtures in `conftest.py` to avoid code duplication

## Continuous Integration

To run all tests with coverage in CI/CD:
```bash
pytest --cov=app --cov-report=xml --junitxml=junit.xml -v
```

## Troubleshooting

### "ModuleNotFoundError: No module named 'app'"
Ensure you're running pytest from the `backend/` directory.

### Database locked errors
This is normal when running tests in parallel. Run sequentially:
```bash
pytest -n0
```

### Async tests fail
Tests use `pytest-asyncio`. If issues occur, check:
```bash
pytest --asyncio-mode=auto
```
