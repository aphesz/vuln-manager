"""consolidate report templates

Revision ID: 018_consolidate_report_templates
Revises: 017_add_custom_report_templates
Create Date: 2025-11-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '018_consolidate_report_templates'
down_revision = '017_add_custom_report_templates'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to reporttemplate table if they don't already exist
    bind = op.get_bind()
    insp = sa.inspect(bind)
    table_name = 'reporttemplate'
    existing_tables = set(insp.get_table_names())
    if table_name in existing_tables:
        existing_cols = {c['name'] for c in insp.get_columns(table_name)}
        if 'layout_config' not in existing_cols:
            op.add_column(table_name, sa.Column('layout_config', sa.Text(), nullable=True))
        if 'is_public' not in existing_cols:
            op.add_column(table_name, sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'))
        if 'usage_count' not in existing_cols:
            op.add_column(table_name, sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'))
        if 'last_used_at' not in existing_cols:
            op.add_column(table_name, sa.Column('last_used_at', sa.TIMESTAMP(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove columns
    op.drop_column('reporttemplate', 'last_used_at')
    op.drop_column('reporttemplate', 'usage_count')
    op.drop_column('reporttemplate', 'is_public')
    op.drop_column('reporttemplate', 'layout_config')
