"""Add import_history table for tracking CWE/CVE imports

Revision ID: 012_add_import_history
Revises: 011_add_attack_techniques
Create Date: 2025-11-06 14:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '012_add_import_history'
down_revision = '011_add_attack_techniques'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create import_history table."""
    op.create_table(
        'import_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('import_type', sa.String(length=50), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('templates_created', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('templates_updated', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('templates_skipped', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('errors', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_parsed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('imported_by', sa.String(length=100), nullable=False, server_default='system'),
        sa.Column('imported_at', postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('error_details', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for common queries
    op.create_index('ix_import_history_source', 'import_history', ['source'])
    op.create_index('ix_import_history_imported_at', 'import_history', ['imported_at'])


def downgrade() -> None:
    """Drop import_history table."""
    op.drop_index('ix_import_history_imported_at', table_name='import_history')
    op.drop_index('ix_import_history_source', table_name='import_history')
    op.drop_table('import_history')
