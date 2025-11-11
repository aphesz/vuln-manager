"""add_finding_risk_rating_fields

Add CWE, CVE, CVSS, and OWASP risk rating fields to Finding model.

Revision ID: 020_add_finding_risk_rating_fields
Revises: 019_add_finding_impact_references_poc
Create Date: 2025-11-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '020_add_finding_risk_rating_fields'
down_revision: Union[str, None] = '019_add_finding_impact_references_poc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add risk rating fields to finding table."""
    # Check if columns exist before adding them (idempotent)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = {col['name'] for col in inspector.get_columns('finding')}
    
    # Add CWE ID field
    if 'cwe_id' not in existing_columns:
        op.add_column('finding', sa.Column('cwe_id', sa.String(length=20), nullable=True))
        op.create_index(op.f('ix_finding_cwe_id'), 'finding', ['cwe_id'], unique=False)
    
    # Add CVE ID field
    if 'cve_id' not in existing_columns:
        op.add_column('finding', sa.Column('cve_id', sa.String(length=50), nullable=True))
        op.create_index(op.f('ix_finding_cve_id'), 'finding', ['cve_id'], unique=False)
    
    # Add CVSS fields
    if 'cvss_vector' not in existing_columns:
        op.add_column('finding', sa.Column('cvss_vector', sa.String(length=100), nullable=True))
    
    if 'cvss_score' not in existing_columns:
        op.add_column('finding', sa.Column('cvss_score', sa.Float(), nullable=True))
    
    # Add OWASP risk rating fields
    if 'owasp_likelihood' not in existing_columns:
        op.add_column('finding', sa.Column('owasp_likelihood', sa.Integer(), nullable=True))
    
    if 'owasp_impact' not in existing_columns:
        op.add_column('finding', sa.Column('owasp_impact', sa.Integer(), nullable=True))
    
    if 'owasp_risk_rating' not in existing_columns:
        op.add_column('finding', sa.Column('owasp_risk_rating', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Remove risk rating fields from finding table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = {col['name'] for col in inspector.get_columns('finding')}
    
    # Drop columns if they exist
    if 'owasp_risk_rating' in existing_columns:
        op.drop_column('finding', 'owasp_risk_rating')
    
    if 'owasp_impact' in existing_columns:
        op.drop_column('finding', 'owasp_impact')
    
    if 'owasp_likelihood' in existing_columns:
        op.drop_column('finding', 'owasp_likelihood')
    
    if 'cvss_score' in existing_columns:
        op.drop_column('finding', 'cvss_score')
    
    if 'cvss_vector' in existing_columns:
        op.drop_column('finding', 'cvss_vector')
    
    if 'cve_id' in existing_columns:
        op.drop_index(op.f('ix_finding_cve_id'), table_name='finding')
        op.drop_column('finding', 'cve_id')
    
    if 'cwe_id' in existing_columns:
        op.drop_index(op.f('ix_finding_cwe_id'), table_name='finding')
        op.drop_column('finding', 'cwe_id')
