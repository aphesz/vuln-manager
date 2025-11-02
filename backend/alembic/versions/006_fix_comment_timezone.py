"""Fix comment timezone - change created_at to timestamptz

Revision ID: 006_fix_comment_timezone
Revises: 005_add_timezone_preferences
Create Date: 2025-01-XX XX:XX:XX.XXXXXX

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006_fix_comment_timezone'
down_revision = '005_add_timezone_preferences'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Convert created_at column from TIMESTAMP (naive) to TIMESTAMPTZ (timezone-aware).
    
    This assumes all existing timestamps in the database are UTC (which they should be
    since get_utc_now() is used). The AT TIME ZONE clauses ensure proper conversion:
    1. First 'UTC' tells PostgreSQL to interpret existing naive timestamps as UTC
    2. Second conversion to timestamptz preserves the UTC timezone info
    """
    # Convert existing TIMESTAMP column to TIMESTAMPTZ
    # Two-step process to ensure existing data is interpreted as UTC
    op.execute("""
        ALTER TABLE comment 
        ALTER COLUMN created_at TYPE timestamp with time zone 
        USING created_at AT TIME ZONE 'UTC'
    """)


def downgrade() -> None:
    """
    Revert timestamptz back to timestamp (naive).
    Note: This will lose timezone information!
    """
    op.execute("""
        ALTER TABLE comment 
        ALTER COLUMN created_at TYPE timestamp without time zone 
        USING created_at AT TIME ZONE 'UTC'
    """)
