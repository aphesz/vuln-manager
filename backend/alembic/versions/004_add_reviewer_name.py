"""add reviewer_name to finding

Revision ID: 004_add_reviewer_name
Revises: 003_add_issue_status
Create Date: 2025-11-02

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_add_reviewer_name'
down_revision = '003_add_issue_status'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add reviewer_name column to finding table."""
    op.add_column('finding', sa.Column('reviewer_name', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Remove reviewer_name column from finding table."""
    op.drop_column('finding', 'reviewer_name')
