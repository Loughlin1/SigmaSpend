"""
Shared test fixtures for pytest.
"""
import os
import tempfile
from pathlib import Path
from typing import Generator

import pytest
import yaml
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from app.database.session import Base
from app.main import app
from app.api.deps import get_db


# Use an in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def test_engine():
    """Create a test database engine with in-memory SQLite."""
    engine = create_engine(
        TEST_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(test_engine) -> Generator[Session, None, None]:
    """Create a fresh database session for each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session) -> TestClient:
    """Create a test client with dependency injection for the database."""
    def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    client = TestClient(app)
    yield client
    
    app.dependency_overrides.clear()


@pytest.fixture
def sample_config_yaml() -> dict:
    """Create a sample bank configuration for testing."""
    return {
        "active_bank": "test_bank",
        "banks": {
            "test_bank": {
                "account_id": "test_account_001",
                "amount_style": "single_column",
                "mappings": {
                    "date_column": "Date",
                    "description_column": "Description",
                    "amount_column": "Amount",
                },
            }
        },
    }


@pytest.fixture
def sample_split_column_config() -> dict:
    """Create a sample bank configuration with split columns for income/expense."""
    return {
        "active_bank": "split_bank",
        "banks": {
            "split_bank": {
                "account_id": "split_account_001",
                "amount_style": "split_columns",
                "mappings": {
                    "date_column": "Date",
                    "description_column": "Description",
                    "amount_out_column": "Debit",
                    "amount_in_column": "Credit",
                },
            }
        },
    }


@pytest.fixture
def sample_csv_data() -> str:
    """Create sample CSV data for testing file uploads."""
    return """Date,Description,Amount
2024-01-01,Grocery Store,-50.00
2024-01-02,Salary,3000.00
2024-01-03,Utilities,-120.00
"""


@pytest.fixture
def sample_expense_data() -> dict:
    """Create sample expense data for testing."""
    return {
        "amount": 75.50,
        "is_income": False,
        "category": "Food & Dining",
        "description": "Restaurant dinner",
        "date": "2024-01-15",
        "account_id": "test_account_001",
    }


@pytest.fixture
def sample_income_data() -> dict:
    """Create sample income data for testing."""
    return {
        "amount": 3000.00,
        "is_income": True,
        "category": "Salary",
        "description": "Monthly salary",
        "date": "2024-01-01",
        "account_id": "test_account_001",
    }


@pytest.fixture
def test_bank_account(client) -> dict:
    """Create a test bank account and return its details."""
    account_data = {
        "account_id": "test_account_001",
        "account_name": "Test Checking",
        "bank_name": "Test Bank",
        "amount_style": "single_column",
        "mappings": {
            "date_column": "Date",
            "description_column": "Description",
            "amount_column": "Amount",
        }
    }
    
    response = client.post("/api/v1/accounts", json=account_data)
    
    if response.status_code != 201:
        # Account might already exist, try to retrieve it
        get_response = client.get(f"/api/v1/accounts/{account_data['account_id']}")
        if get_response.status_code == 200:
            return get_response.json()
        raise Exception(f"Failed to create/get test account: {response.text}")
    
    return response.json()


@pytest.fixture
def sample_csv_data() -> str:
    """Create sample CSV data for testing."""
    return """Date,Description,Amount
2024-01-01,Grocery Store,-50.00
2024-01-02,Salary,2000.00
2024-01-03,Gas Station,-30.50
"""


@pytest.fixture
def sample_split_column_csv_data() -> str:
    """Create sample CSV data with split columns."""
    return """Date,Description,Debit,Credit
2024-01-01,Grocery Store,50.00,
2024-01-02,Salary,,2000.00
2024-01-03,Gas Station,30.50,
"""


@pytest.fixture
def temp_config_file(sample_config_yaml: dict) -> Generator[Path, None, None]:
    """Create a temporary config.yaml file for testing."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
        yaml.dump(sample_config_yaml, f)
        temp_path = Path(f.name)
    
    yield temp_path
    
    if temp_path.exists():
        temp_path.unlink()
