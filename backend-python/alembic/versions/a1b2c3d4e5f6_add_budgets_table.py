"""add_budgets_table

Revision ID: a1b2c3d4e5f6
Revises: e77f7455752c
Create Date: 2026-06-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'e77f7455752c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'budgets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('period', sa.String(), nullable=False, server_default='monthly'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('category_id'),
    )
    op.create_index('ix_budgets_id', 'budgets', ['id'])


def downgrade() -> None:
    op.drop_index('ix_budgets_id', table_name='budgets')
    op.drop_table('budgets')
