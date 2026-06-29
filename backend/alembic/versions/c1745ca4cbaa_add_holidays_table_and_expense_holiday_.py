"""add_holidays_table_and_expense_holiday_id

Revision ID: c1745ca4cbaa
Revises: b2c3d4e5f6a7
Create Date: 2026-06-26 13:23:44.805602

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1745ca4cbaa'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'holidays',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('destination', sa.String(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_holidays_id', 'holidays', ['id'], unique=False)

    with op.batch_alter_table('expenses') as batch_op:
        batch_op.add_column(sa.Column('holiday_id', sa.Integer(), nullable=True))
        batch_op.create_index('ix_expenses_holiday_id', ['holiday_id'], unique=False)
        batch_op.create_foreign_key(
            'fk_expenses_holiday_id',
            'holidays',
            ['holiday_id'], ['id'],
        )


def downgrade() -> None:
    with op.batch_alter_table('expenses') as batch_op:
        batch_op.drop_constraint('fk_expenses_holiday_id', type_='foreignkey')
        batch_op.drop_index('ix_expenses_holiday_id')
        batch_op.drop_column('holiday_id')

    op.drop_index('ix_holidays_id', table_name='holidays')
    op.drop_table('holidays')
