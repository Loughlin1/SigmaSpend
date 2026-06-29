"""add_flag_to_holidays

Revision ID: dc179d43ecd1
Revises: c1745ca4cbaa
Create Date: 2026-06-26 14:36:05.157820

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dc179d43ecd1'
down_revision: Union[str, Sequence[str], None] = 'c1745ca4cbaa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('holidays') as batch_op:
        batch_op.add_column(sa.Column('flag', sa.String(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('holidays') as batch_op:
        batch_op.drop_column('flag')
