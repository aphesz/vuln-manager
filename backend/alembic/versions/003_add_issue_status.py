"""add issue status to findings

Revision ID: 003_add_issue_status
Revises: 002_add_finding_columns
Create Date: 2025-11-01

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_add_issue_status'
down_revision = '002_add_finding_columns'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Create ENUM type for issue status (if not exists)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE issuestatus AS ENUM ('Open', 'Partially Closed', 'Closed');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Add issue_status column with default 'Open' (if not exists)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE finding ADD COLUMN issue_status issuestatus NOT NULL DEFAULT 'Open';
        EXCEPTION
            WHEN duplicate_column THEN null;
        END $$;
    """)
    
    # Add optional issue_status_comment column (if not exists)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE finding ADD COLUMN issue_status_comment VARCHAR;
        EXCEPTION
            WHEN duplicate_column THEN null;
        END $$;
    """)
    
    # Create index on issue_status for faster filtering (if not exists)
    op.execute("""
        DO $$ BEGIN
            CREATE INDEX ix_finding_issue_status ON finding(issue_status);
        EXCEPTION
            WHEN duplicate_table THEN null;
        END $$;
    """)

def downgrade() -> None:
    op.drop_index('ix_finding_issue_status', 'finding')
    op.drop_column('finding', 'issue_status_comment')
    op.drop_column('finding', 'issue_status')
    op.execute("DROP TYPE issuestatus")
