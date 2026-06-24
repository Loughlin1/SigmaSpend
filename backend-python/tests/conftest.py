"""
Shared test fixtures for pytest.
"""
import os
import datetime
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

from app.models.bank_account import BankAccount
from app.models.expense import Expense
from app.models.category import Category
from app.models.category_rules import CategoryRule

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def test_engine():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(test_engine) -> Generator[Session, None, None]:
    connection = test_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(autocommit=False, autoflush=False, bind=connection)()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session) -> TestClient:
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_csv_data() -> str:
    return """Date,Description,Amount
2024-01-01,Grocery Store,-50.00
2024-01-02,Salary,3000.00
2024-01-03,Utilities,-120.00
"""


@pytest.fixture
def sample_split_column_csv_data() -> str:
    return """Date,Description,Debit,Credit
2024-01-01,Grocery Store,50.00,
2024-01-02,Salary,,2000.00
2024-01-03,Gas Station,30.50,
"""


@pytest.fixture
def test_bank_account(client) -> dict:
    """Create a test bank account and return its details (uses integer id)."""
    account_data = {
        "account_name": "Test Checking",
        "bank_name": "Test Bank",
        "amount_style": "single_column",
        "invert_amounts": False,
        "mappings": {
            "date_column": "Date",
            "description_column": "Description",
            "amount_column": "Amount",
        },
    }
    response = client.post("/api/v1/accounts/", json=account_data)
    if response.status_code != 201:
        raise Exception(f"Failed to create test account: {response.text}")
    return response.json()


@pytest.fixture
def test_category(db_session) -> Category:
    """Create a test category directly in the DB."""
    cat = Category(name="Test Food", icon="🍔")
    db_session.add(cat)
    db_session.flush()
    return cat


@pytest.fixture
def sample_expense_data(test_bank_account) -> dict:
    """Expense payload using the real integer account id from the test fixture."""
    return {
        "amount": 75.50,
        "is_income": False,
        "description": "Restaurant dinner",
        "date": "2024-01-15",
        "account_id": test_bank_account["id"],
        "notes": None,
        "category_id": None,
    }


@pytest.fixture
def sample_income_data(test_bank_account) -> dict:
    return {
        "amount": 3000.00,
        "is_income": True,
        "description": "Monthly salary",
        "date": "2024-01-01",
        "account_id": test_bank_account["id"],
        "notes": None,
        "category_id": None,
    }


@pytest.fixture
def sample_config_yaml() -> dict:
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
def temp_config_file(sample_config_yaml: dict) -> Generator[Path, None, None]:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.dump(sample_config_yaml, f)
        temp_path = Path(f.name)
    yield temp_path
    if temp_path.exists():
        temp_path.unlink()
