"""
Tests for the StatementParserService.
"""
import hashlib
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
import yaml

from app.services.parser import StatementParserService
from app.models.expense import Expense
from app.models.bank_account import BankAccount
from fastapi import HTTPException


class TestStatementParserService:
    """Test suite for the StatementParserService."""
    
    def test_generate_transaction_hash(self):
        """Test transaction hash generation is deterministic."""
        hash1 = StatementParserService.generate_transaction_hash(
            account_id="acc001",
            date="2024-01-01",
            amount=50.0,
            is_income=False,
            description="Test",
            occurrence=1
        )
        
        hash2 = StatementParserService.generate_transaction_hash(
            account_id="acc001",
            date="2024-01-01",
            amount=50.0,
            is_income=False,
            description="Test",
            occurrence=1
        )
        
        # Same inputs should produce same hash
        assert hash1 == hash2
        assert len(hash1) == 32  # MD5 hash length
    
    def test_generate_transaction_hash_different_inputs(self):
        """Test that different inputs produce different hashes."""
        hash1 = StatementParserService.generate_transaction_hash(
            account_id="acc001",
            date="2024-01-01",
            amount=50.0,
            is_income=False,
            description="Test",
            occurrence=1
        )
        
        hash2 = StatementParserService.generate_transaction_hash(
            account_id="acc001",
            date="2024-01-01",
            amount=100.0,  # Different amount
            is_income=False,
            description="Test",
            occurrence=1
        )
        
        assert hash1 != hash2
    
    def test_generate_transaction_hash_case_insensitive_description(self):
        """Test that description is normalized to lowercase."""
        hash1 = StatementParserService.generate_transaction_hash(
            account_id="acc001",
            date="2024-01-01",
            amount=50.0,
            is_income=False,
            description="GROCERY STORE",
            occurrence=1
        )
        
        hash2 = StatementParserService.generate_transaction_hash(
            account_id="acc001",
            date="2024-01-01",
            amount=50.0,
            is_income=False,
            description="grocery store",
            occurrence=1
        )
        
        # Different case should produce same hash
        assert hash1 == hash2
    
    @patch('app.services.parser.Path')
    def test_load_bank_config_success(self, mock_path, sample_config_yaml):
        """Test loading bank configuration successfully."""
        mock_config_path = MagicMock()
        mock_config_path.exists.return_value = True
        mock_config_path.__truediv__.return_value = mock_config_path
        mock_path.return_value = mock_config_path
        
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = yaml.dump(sample_config_yaml)
            
            with patch('yaml.safe_load', return_value=sample_config_yaml):
                config = StatementParserService.load_bank_config()
        
        assert config['account_id'] == 'test_account_001'
        assert config['amount_style'] == 'single_column'
    
    def test_load_bank_config_file_missing(self):
        """Test error handling when config file is missing."""
        # Patch the exists() call to simulate missing file
        with patch('pathlib.Path.exists', return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                StatementParserService.load_bank_config()
        
        assert exc_info.value.status_code == 500
        assert "Configuration file missing" in exc_info.value.detail
    
    @patch('app.services.parser.Path')
    def test_load_bank_config_invalid_yaml(self, mock_path):
        """Test error handling for invalid YAML syntax."""
        mock_config_path = MagicMock()
        mock_config_path.exists.return_value = True
        mock_path.return_value = mock_config_path
        
        with patch('builtins.open', create=True):
            with patch('yaml.safe_load', side_effect=yaml.YAMLError("Invalid YAML")):
                with pytest.raises(HTTPException) as exc_info:
                    StatementParserService.load_bank_config()
        
        assert exc_info.value.status_code == 500
        assert "Failed to parse config.yaml" in exc_info.value.detail
    
    @patch('app.services.parser.Path')
    def test_load_bank_config_missing_active_bank(self, mock_path):
        """Test error handling when active bank is not defined."""
        config_data = {
            "active_bank": "nonexistent_bank",
            "banks": {}
        }
        
        mock_config_path = MagicMock()
        mock_config_path.exists.return_value = True
        mock_path.return_value = mock_config_path
        
        with patch('builtins.open', create=True):
            with patch('yaml.safe_load', return_value=config_data):
                with pytest.raises(HTTPException) as exc_info:
                    StatementParserService.load_bank_config()
        
        assert exc_info.value.status_code == 400
        assert "not defined in config.yaml" in exc_info.value.detail
    
    def test_process_csv_single_column_format(self, db_session, sample_csv_data):
        """Test CSV processing with single column amount format."""
        db_session.add(BankAccount(
            account_id="test_account",
            account_name="Test Account",
            bank_name="Test Bank",
            amount_style="single_column",
            mappings={
                "date_column": "Date",
                "description_column": "Description",
                "amount_column": "Amount",
            }
        ))
        db_session.commit()
        
        result = StatementParserService.process_csv(sample_csv_data, db_session, account_id="test_account")
        
        assert result['added'] == 3
        assert result['skipped'] == 0
        
        # Verify expenses were created
        expenses = db_session.query(Expense).all()
        assert len(expenses) == 3
        
        # Check specific transaction
        expense = next((e for e in expenses if "Grocery" in e.description), None)
        assert expense is not None
        assert expense.amount == 50.00
        assert expense.is_income is False
    
    def test_process_csv_split_column_format(self, db_session, sample_split_column_csv_data):
        """Test CSV processing with split column amount format."""
        db_session.add(BankAccount(
            account_id="split_account",
            account_name="Split Account",
            bank_name="Test Bank",
            amount_style="split_columns",
            mappings={
                "date_column": "Date",
                "description_column": "Description",
                "amount_out_column": "Debit",
                "amount_in_column": "Credit",
            }
        ))
        db_session.commit()
        
        result = StatementParserService.process_csv(sample_split_column_csv_data, db_session, account_id="split_account")
        
        assert result['added'] == 3
        expenses = db_session.query(Expense).all()
        assert len(expenses) == 3
    
    def test_process_csv_duplicate_detection(self, db_session, sample_csv_data):
        """Test that duplicate transactions are skipped."""
        db_session.add(BankAccount(
            account_id="test_account",
            account_name="Test Account",
            bank_name="Test Bank",
            amount_style="single_column",
            mappings={
                "date_column": "Date",
                "description_column": "Description",
                "amount_column": "Amount",
            }
        ))
        db_session.commit()
        
        # Process CSV first time
        result1 = StatementParserService.process_csv(sample_csv_data, db_session, account_id="test_account")
        assert result1['added'] == 3
        
        # Process same CSV again - all should be skipped
        result2 = StatementParserService.process_csv(sample_csv_data, db_session, account_id="test_account")
        assert result2['added'] == 0
        assert result2['skipped'] == 3
    
    def test_process_csv_identical_twins(self, db_session):
        """Test handling of identical transaction twins (same date/amount/description)."""
        db_session.add(BankAccount(
            account_id="test_account",
            account_name="Test Account",
            bank_name="Test Bank",
            amount_style="single_column",
            mappings={
                "date_column": "Date",
                "description_column": "Description",
                "amount_column": "Amount",
            }
        ))
        db_session.commit()
        
        # CSV with identical transactions
        csv_data = """Date,Description,Amount
2024-01-01,Same Store,-50.00
2024-01-01,Same Store,-50.00
"""
        
        result = StatementParserService.process_csv(csv_data, db_session, account_id="test_account")
        
        # Both should be added with different occurrence numbers
        assert result['added'] == 2
        expenses = db_session.query(Expense).all()
        assert len(expenses) == 2
        
        # Both should exist even though they're identical
        hashes = [e.transaction_hash for e in expenses]
        assert hashes[0] != hashes[1]
