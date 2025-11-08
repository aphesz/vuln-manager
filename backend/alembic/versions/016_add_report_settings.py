"""Add report templates and email settings tables

Revision ID: 016_add_report_settings
Revises: 0cb8a3b4a6b6, 8f7f56672c50
Create Date: 2025-06-05 15:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '016_add_report_settings'
down_revision: Union[str, None] = ('0cb8a3b4a6b6', '8f7f56672c50')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create email_settings table
    op.create_table(
        'email_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('smtp_host', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('smtp_port', sa.Integer(), nullable=False),
        sa.Column('smtp_username', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('smtp_password', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('smtp_use_tls', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('smtp_use_ssl', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('from_email', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('from_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create report_branding table
    op.create_table(
        'report_branding',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('company_address', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('company_phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('company_email', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('company_website', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('logo_path', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('primary_color', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='#1976d2'),
        sa.Column('secondary_color', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default='#dc004e'),
        sa.Column('footer_text', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('report_branding')
    op.drop_table('email_settings')
