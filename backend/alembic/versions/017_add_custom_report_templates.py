"""add custom report templates

Revision ID: 017_add_custom_report_templates
Revises: 016_add_report_settings
Create Date: 2025-11-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '017_add_custom_report_templates'
down_revision = '016_add_report_settings'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create custom_report_templates table if it doesn't already exist
    bind = op.get_bind()
    insp = sa.inspect(bind)

    table_name = 'custom_report_templates'
    existing_tables = set(insp.get_table_names())
    if table_name not in existing_tables:
        op.create_table(
            table_name,
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
            table_name,
            ['name']
        )
        op.create_index(
            'ix_custom_report_templates_created_at',
            table_name,
            ['created_at']
        )
    else:
        # Ensure indexes exist when table pre-exists
        existing_indexes = {ix['name'] for ix in insp.get_indexes(table_name)}
        if 'ix_custom_report_templates_name' not in existing_indexes:
            op.create_index('ix_custom_report_templates_name', table_name, ['name'])
        if 'ix_custom_report_templates_created_at' not in existing_indexes:
            op.create_index('ix_custom_report_templates_created_at', table_name, ['created_at'])

    # Add Custom to ReportTemplateType enum (if it exists and value not already present)
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reporttemplatetype') THEN
                IF NOT EXISTS (
                    SELECT 1 
                    FROM pg_enum e 
                    JOIN pg_type t ON t.oid = e.enumtypid 
                    WHERE t.typname = 'reporttemplatetype' 
                      AND e.enumlabel = 'Custom Template'
                ) THEN
                    ALTER TYPE reporttemplatetype ADD VALUE 'Custom Template';
                END IF;
            END IF;
        END $$;
        """
    )
    
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
