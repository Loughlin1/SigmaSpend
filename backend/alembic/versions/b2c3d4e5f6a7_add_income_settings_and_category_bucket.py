"""add_income_settings_and_category_bucket

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'income_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('monthly_net_income', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_income_settings_id', 'income_settings', ['id'])

    with op.batch_alter_table('categories') as batch_op:
        batch_op.add_column(sa.Column('bucket', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('categories') as batch_op:
        batch_op.drop_column('bucket')

    op.drop_index('ix_income_settings_id', table_name='income_settings')
    op.drop_table('income_settings')
