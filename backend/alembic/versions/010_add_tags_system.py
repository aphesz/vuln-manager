"""Add tags system

Revision ID: 010_add_tags_system
Revises: 009_add_matched_by_column
Create Date: 2025-11-04 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '010_add_tags_system'
down_revision: Union[str, None] = '009_add_matched_by_column'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create tags and finding_tags tables."""
    
    # Create tag table
    op.create_table(
        'tag',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=False, server_default='#2196F3'),
        sa.Column('description', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for tag table
    op.create_index(op.f('ix_tag_name'), 'tag', ['name'], unique=True)
    
    # Create finding_tags junction table
    op.create_table(
        'finding_tags',
        sa.Column('finding_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('finding_id', 'tag_id'),
        sa.ForeignKeyConstraint(['finding_id'], ['finding.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tag.id'], ondelete='CASCADE')
    )
    
    # Create indexes for finding_tags junction table
    op.create_index(op.f('ix_finding_tags_finding_id'), 'finding_tags', ['finding_id'], unique=False)
    op.create_index(op.f('ix_finding_tags_tag_id'), 'finding_tags', ['tag_id'], unique=False)


def downgrade() -> None:
    """Remove tags and finding_tags tables."""
    
    # Drop finding_tags junction table
    op.drop_index(op.f('ix_finding_tags_tag_id'), table_name='finding_tags')
    op.drop_index(op.f('ix_finding_tags_finding_id'), table_name='finding_tags')
    op.drop_table('finding_tags')
    
    # Drop tag table
    op.drop_index(op.f('ix_tag_name'), table_name='tag')
    op.drop_table('tag')
