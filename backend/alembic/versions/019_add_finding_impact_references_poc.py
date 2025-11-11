"""Add impact/references/poc fields and finding_artifact table

Revision ID: 019_add_finding_impact_references_poc
Revises: 018_consolidate_report_templates
Create Date: 2025-11-11 00:00:00

This migration extends the Finding schema with:
- impact (TEXT)
- references_url (VARCHAR)
- poc_description (TEXT)

And introduces a new table:
- finding_artifact: stores POC evidence files metadata linked to a finding
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '019_add_finding_impact_references_poc'
down_revision = '018_consolidate_report_templates'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to finding if they don't already exist
    bind = op.get_bind()
    insp = sa.inspect(bind)
    finding_cols = {c['name'] for c in insp.get_columns('finding')}
    if 'impact' not in finding_cols:
        op.add_column('finding', sa.Column('impact', sa.Text(), nullable=True))
    if 'references_url' not in finding_cols:
        op.add_column('finding', sa.Column('references_url', sa.String(length=1000), nullable=True))
    if 'poc_description' not in finding_cols:
        op.add_column('finding', sa.Column('poc_description', sa.Text(), nullable=True))

    # Create finding_artifact table if it doesn't already exist
    if 'finding_artifact' not in insp.get_table_names():
        op.create_table(
            'finding_artifact',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('finding_id', sa.Integer(), sa.ForeignKey('finding.id', ondelete='CASCADE'), index=True, nullable=False),
            sa.Column('file_name', sa.String(length=255), nullable=False),
            sa.Column('file_path', sa.String(length=500), nullable=False),
            sa.Column('mime_type', sa.String(length=100), nullable=False),
            sa.Column('size_bytes', sa.Integer(), nullable=False),
            sa.Column('description', sa.String(length=2000), nullable=True),
            sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), nullable=True, index=True),
        )


def downgrade() -> None:
    # Drop artifact table
    op.drop_table('finding_artifact')
    # Remove columns from finding
    op.drop_column('finding', 'poc_description')
    op.drop_column('finding', 'references_url')
    op.drop_column('finding', 'impact')
