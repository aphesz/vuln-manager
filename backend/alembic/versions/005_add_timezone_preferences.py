"""Add timezone and user preferences support

Revision ID: 005
Revises: 004
Create Date: 2025-11-02 13:25:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None

def upgrade():
    """Add UserPreferences table for timezone and locale settings."""
    
    # Create userpreferences table
    op.create_table(
        'userpreferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_email', sa.String(), nullable=False),
        sa.Column('timezone', sa.String(), nullable=False, server_default='Asia/Kuala_Lumpur'),
        sa.Column('date_format', sa.String(), nullable=False, server_default='%Y-%m-%d %H:%M:%S %Z'),
        sa.Column('locale', sa.String(), nullable=False, server_default='en_MY'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create unique index on user_email
    op.create_index(
        'ix_userpreferences_user_email',
        'userpreferences',
        ['user_email'],
        unique=True
    )

def downgrade():
    """Remove UserPreferences table."""
    op.drop_index('ix_userpreferences_user_email', table_name='userpreferences')
    op.drop_table('userpreferences')
