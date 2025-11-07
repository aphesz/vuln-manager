"""Add owasp_category field to Finding for OWASP Top 10 mapping

Revision ID: 014_add_owasp_category
Revises: 013_add_finding_timeline_fields
Create Date: 2025-11-07 14:00:00

This migration adds OWASP Top 10 2021 category tracking to the Finding model
to support v0.8.3 compliance mapping features:
- owasp_category: OWASP Top 10 2021 category (A01-A10 or null)

This field enables compliance tracking and coverage reporting against
the OWASP Top 10 2021 framework.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '014_add_owasp_category'
down_revision = '013_add_finding_timeline_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add owasp_category column to finding table."""
    
    # Add owasp_category column (nullable - not all findings map to OWASP Top 10)
    op.add_column(
        'finding',
        sa.Column('owasp_category', sa.String(length=10), nullable=True)
    )
    
    # Create index for efficient compliance queries
    op.create_index('ix_finding_owasp_category', 'finding', ['owasp_category'])


def downgrade() -> None:
    """Remove owasp_category column from finding table."""
    op.drop_index('ix_finding_owasp_category', table_name='finding')
    op.drop_column('finding', 'owasp_category')
