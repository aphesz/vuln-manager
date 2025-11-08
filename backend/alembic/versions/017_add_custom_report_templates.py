"""add custom report templates

Revision ID: 017
Revises: 016
Create Date: 2025-11-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '017'
down_revision = '016'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create custom_report_templates table
    op.create_table(
        'custom_report_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.String(length=1000), nullable=True),
        sa.Column('template_json', sa.Text(), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_by', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('last_used_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(
        'ix_custom_report_templates_name',
        'custom_report_templates',
        ['name']
    )
    op.create_index(
        'ix_custom_report_templates_created_at',
        'custom_report_templates',
        ['created_at']
    )
    
    # Add Custom to ReportTemplateType enum (if it doesn't already exist)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = 'Custom Template' 
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'reporttemplatetype')
            ) THEN
                ALTER TYPE reporttemplatetype ADD VALUE 'Custom Template';
            END IF;
        END $$;
    """)
    
    # Add custom_template_id column to any future report_generation_log table if needed
    # (Optional: track which custom template was used for each report)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_custom_report_templates_created_at', table_name='custom_report_templates')
    op.drop_index('ix_custom_report_templates_name', table_name='custom_report_templates')
    
    # Drop table
    op.drop_table('custom_report_templates')
    
    # Note: Cannot remove enum value in PostgreSQL without recreating the entire enum type
    # This is left as-is for safety
