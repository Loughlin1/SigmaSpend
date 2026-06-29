"""Drop bank_profile column from bank account table

Revision ID: e77f7455752c
Revises: 42a8531825fc
Create Date: 2026-06-23 16:51:06.888625

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e77f7455752c'
down_revision: Union[str, Sequence[str], None] = '42a8531825fc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table to cleanly support SQLite dropping operations
    with op.batch_alter_table('bank_accounts') as batch_op:
        batch_op.drop_column('bank_profile')


def downgrade() -> None:
    # Safe fallback if you ever need to restore the column schema
    with op.batch_alter_table('bank_accounts') as batch_op:
        batch_op.add_column(sa.Column('bank_profile', sa.String(), nullable=True))
