"""add_report_template_docx_support

Add docx_file_path field to ReportTemplate for user-uploaded DOCX templates.

Revision ID: 021_add_report_template_docx_support
Revises: 020_add_finding_risk_rating_fields
Create Date: 2025-11-12 12:56:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '021_add_report_template_docx_support'
down_revision: Union[str, None] = '020_add_finding_risk_rating_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add docx_file_path column to reporttemplate table."""
    # Check if column exists before adding (idempotent)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Check if reporttemplate table exists
    tables = inspector.get_table_names()
    if 'reporttemplate' not in tables:
        print("reporttemplate table does not exist yet - skipping")
        return
    
    existing_columns = {col['name'] for col in inspector.get_columns('reporttemplate')}
    
    # Add docx_file_path field
    if 'docx_file_path' not in existing_columns:
        op.add_column('reporttemplate', sa.Column('docx_file_path', sa.String(length=500), nullable=True))
        print("✓ Added docx_file_path column to reporttemplate table")
    else:
        print("docx_file_path column already exists - skipping")


def downgrade() -> None:
    """Remove docx_file_path column from reporttemplate table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    tables = inspector.get_table_names()
    if 'reporttemplate' not in tables:
        return
    
    existing_columns = {col['name'] for col in inspector.get_columns('reporttemplate')}
    
    if 'docx_file_path' in existing_columns:
        op.drop_column('reporttemplate', 'docx_file_path')
