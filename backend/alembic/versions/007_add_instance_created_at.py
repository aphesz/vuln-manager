"""Add created_at to instance table

Revision ID: 007_add_instance_created_at
Revises: 006_fix_comment_timezone
Create Date: 2025-11-03 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '007_add_instance_created_at'
down_revision: Union[str, None] = '006_fix_comment_timezone'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add created_at timestamp to instance table."""
    # Add created_at column with default to current timestamp
    op.add_column('instance', sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=True))
    
    # Set current timestamp for existing instances
    op.execute("UPDATE instance SET created_at = NOW() WHERE created_at IS NULL")
    
    # Create index on created_at for performance
    op.create_index(op.f('ix_instance_created_at'), 'instance', ['created_at'], unique=False)


def downgrade() -> None:
    """Remove created_at from instance table."""
    op.drop_index(op.f('ix_instance_created_at'), table_name='instance')
    op.drop_column('instance', 'created_at')
