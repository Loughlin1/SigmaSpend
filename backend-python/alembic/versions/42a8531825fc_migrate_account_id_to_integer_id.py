"""migrate_account_id_to_integer_id

Revision ID: 42a8531825fc
Revises: 05bb0c54178d
Create Date: 2026-06-23 15:45:48.251908

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '42a8531825fc'
down_revision: Union[str, Sequence[str], None] = '05bb0c54178d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- PHASE 1: RESTRUCTURE BANK ACCOUNTS ---
    
    # 1. Create a new clean bank accounts table matching your updated model layout
    op.execute("""
        CREATE TABLE bank_accounts_new (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            account_name VARCHAR NOT NULL,
            bank_name VARCHAR NOT NULL,
            amount_style VARCHAR NOT NULL DEFAULT 'single_column',
            invert_amounts BOOLEAN NOT NULL DEFAULT 0,
            mappings JSON NOT NULL,
            bank_profile VARCHAR,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    """)
    
    # 2. Automatically copy your existing account data over
    op.execute("""
        INSERT INTO bank_accounts_new (id, account_name, bank_name, amount_style, invert_amounts, mappings, bank_profile, created_at, is_active)
        SELECT id, account_name, bank_name, amount_style, invert_amounts, mappings, bank_profile, created_at, is_active
        FROM bank_accounts
    """)
    
    # --- PHASE 2: RESTRUCTURE EXPENSES ---
    
    # 3. Create a new expenses table where account_id is configured as an INTEGER
    op.execute("""
        CREATE TABLE expenses_new (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            date DATETIME NOT NULL,
            amount FLOAT NOT NULL,
            is_income BOOLEAN NOT NULL DEFAULT 0,
            description VARCHAR NOT NULL,
            notes VARCHAR,
            category_id INTEGER,
            transaction_hash VARCHAR NOT NULL,
            account_id INTEGER NOT NULL,
            FOREIGN KEY(category_id) REFERENCES categories (id) ON DELETE SET NULL,
            FOREIGN KEY(account_id) REFERENCES bank_accounts_new (id) ON DELETE CASCADE
        )
    """)
    
    # 4. DATA MIGRATION: Automatically map old string column configurations to the new integer IDs
    # This safely bridges your transaction ledger history rows
    op.execute("""
        INSERT INTO expenses_new (id, date, amount, is_income, description, notes, category_id, transaction_hash, account_id)
        SELECT e.id, e.date, e.amount, e.is_income, e.description, e.notes, e.category_id, e.transaction_hash, b.id
        FROM expenses e
        JOIN bank_accounts b ON b.account_id = e.account_id
    """)

    # --- PHASE 3: SWAP AND TEARDOWN ---
    
    # 5. Drop the legacy original tables and index dependencies
    op.execute("DROP TABLE expenses")
    op.execute("DROP TABLE bank_accounts")
    
    # 6. Rename the new structures to take over the application names
    op.execute("ALTER TABLE bank_accounts_new RENAME TO bank_accounts")
    op.execute("ALTER TABLE expenses_new RENAME TO expenses")
    
    # 7. Apply fresh, clean indexes on your newly structured tables
    op.execute("CREATE INDEX ix_bank_accounts_id ON bank_accounts (id)")
    op.execute("CREATE INDEX ix_bank_accounts_is_active ON bank_accounts (is_active)")
    op.execute("CREATE INDEX ix_expenses_id ON expenses (id)")
    op.execute("CREATE INDEX ix_expenses_transaction_hash ON expenses (transaction_hash)")
    op.execute("CREATE INDEX ix_expenses_account_id ON expenses (account_id)")


def downgrade() -> None:
    pass