"""Add matched_by column to vulnerability_matches

Revision ID: 009_add_matched_by_column
Revises: 008_add_vulnerability_repository
Create Date: 2025-11-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '009_add_matched_by_column'
down_revision: Union[str, None] = '008_add_vulnerability_repository'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add matched_by column to vulnerability_matches table."""
    
    with op.batch_alter_table('vulnerability_matches') as batch_op:
        batch_op.add_column(sa.Column('matched_by', sa.String(length=50), nullable=False, server_default='auto'))


def downgrade() -> None:
    """Remove matched_by column from vulnerability_matches table."""
    
    with op.batch_alter_table('vulnerability_matches') as batch_op:
        batch_op.drop_column('matched_by')
