"""consolidate report templates

Revision ID: 018
Revises: 017
Create Date: 2025-11-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to reporttemplate table
    op.add_column('reporttemplate', sa.Column('layout_config', sa.Text(), nullable=True))
    op.add_column('reporttemplate', sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('reporttemplate', sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('reporttemplate', sa.Column('last_used_at', sa.TIMESTAMP(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove columns
    op.drop_column('reporttemplate', 'last_used_at')
    op.drop_column('reporttemplate', 'usage_count')
    op.drop_column('reporttemplate', 'is_public')
    op.drop_column('reporttemplate', 'layout_config')
