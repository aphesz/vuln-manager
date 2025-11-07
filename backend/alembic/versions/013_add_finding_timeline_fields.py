"""Add discovered_at and resolved_at fields to Finding for trend analysis

Revision ID: 013_add_finding_timeline_fields
Revises: 012_add_import_history
Create Date: 2025-11-07 12:00:00

This migration adds timeline tracking fields to the Finding model to support
v0.8.1 trend analysis features:
- discovered_at: When the finding was first detected
- resolved_at: When the finding was marked as resolved

These fields enable historical trend visualization and remediation velocity tracking.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '013_add_finding_timeline_fields'
down_revision = '012_add_import_history'
branch_labels = None
depends_on = '8f7f56672c50'  # Also depends on template versioning migration


def upgrade() -> None:
    """Add discovered_at and resolved_at columns to finding table."""
    
    # Add discovered_at column (nullable initially for backfill)
    op.add_column(
        'finding',
        sa.Column('discovered_at', postgresql.TIMESTAMP(timezone=True), nullable=True)
    )
    
    # Add resolved_at column (nullable, null means still open)
    op.add_column(
        'finding',
        sa.Column('resolved_at', postgresql.TIMESTAMP(timezone=True), nullable=True)
    )
    
    # Backfill discovered_at from created_at timestamp (if exists)
    # For existing findings, use the earliest instance created_at as discovered_at
    op.execute("""
        UPDATE finding f
        SET discovered_at = COALESCE(
            (SELECT MIN(i.created_at) 
             FROM instance i 
             WHERE i.finding_id = f.id),
            NOW()  -- Fallback to current time if no instances
        )
        WHERE discovered_at IS NULL
    """)
    
    # Set resolved_at for findings that are already marked as Closed
    op.execute("""
        UPDATE finding
        SET resolved_at = NOW()
        WHERE issue_status = 'Closed' AND resolved_at IS NULL
    """)
    
    # Make discovered_at NOT NULL after backfill
    op.alter_column('finding', 'discovered_at', nullable=False)
    
    # Create indexes for efficient trend queries
    op.create_index('ix_finding_discovered_at', 'finding', ['discovered_at'])
    op.create_index('ix_finding_resolved_at', 'finding', ['resolved_at'])


def downgrade() -> None:
    """Remove discovered_at and resolved_at columns from finding table."""
    op.drop_index('ix_finding_resolved_at', table_name='finding')
    op.drop_index('ix_finding_discovered_at', table_name='finding')
    op.drop_column('finding', 'resolved_at')
    op.drop_column('finding', 'discovered_at')
