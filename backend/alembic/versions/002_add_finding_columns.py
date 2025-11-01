"""Add new columns to existing finding table

Revision ID: 002_add_finding_columns
Revises: 001_tier1_features
Create Date: 2025-11-01 08:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_add_finding_columns'
down_revision = '001_tier1_features'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types if they don't exist
    reviewstatus_enum = postgresql.ENUM('Pending', 'In Review', 'Approved', 'Rejected', 
                                         name='reviewstatus', create_type=True)
    reviewstatus_enum.create(op.get_bind(), checkfirst=True)
    
    slastatus_enum = postgresql.ENUM('On Track', 'At Risk', 'Overdue', 
                                     name='slastatus', create_type=True)
    slastatus_enum.create(op.get_bind(), checkfirst=True)
    
    # Add new columns to finding table (use checkfirst-like behavior via ALTER TABLE IF NOT EXISTS in raw SQL)
    # Unfortunately, Alembic doesn't have a built-in "IF NOT EXISTS" for columns, so we'll use try-except
    connection = op.get_bind()
    
    # Check if columns exist before adding
    result = connection.execute(sa.text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='finding' AND column_name='review_status'
    """))
    
    if not result.fetchone():
        op.add_column('finding', sa.Column('review_status', postgresql.ENUM('Pending', 'In Review', 'Approved', 'Rejected', 
                                                                             name='reviewstatus', create_type=False), 
                                          server_default='Pending', nullable=False))
        op.create_index('ix_finding_review_status', 'finding', ['review_status'])
    
    result = connection.execute(sa.text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='finding' AND column_name='jira_issue_key'
    """))
    
    if not result.fetchone():
        op.add_column('finding', sa.Column('jira_issue_key', sa.String(length=255), nullable=True))
        op.create_index('ix_finding_jira_issue_key', 'finding', ['jira_issue_key'])
    
    result = connection.execute(sa.text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='finding' AND column_name='jira_status'
    """))
    
    if not result.fetchone():
        op.add_column('finding', sa.Column('jira_status', sa.String(length=255), nullable=True))
    
    result = connection.execute(sa.text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='finding' AND column_name='remediation_deadline'
    """))
    
    if not result.fetchone():
        op.add_column('finding', sa.Column('remediation_deadline', sa.DateTime(), nullable=True))
        op.create_index('ix_finding_remediation_deadline', 'finding', ['remediation_deadline'])
    
    result = connection.execute(sa.text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='finding' AND column_name='sla_status'
    """))
    
    if not result.fetchone():
        op.add_column('finding', sa.Column('sla_status', postgresql.ENUM('On Track', 'At Risk', 'Overdue', 
                                                                          name='slastatus', create_type=False), 
                                          nullable=True))
        op.create_index('ix_finding_sla_status', 'finding', ['sla_status'])
    
    result = connection.execute(sa.text("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name='finding' AND column_name='remediation_owner'
    """))
    
    if not result.fetchone():
        op.add_column('finding', sa.Column('remediation_owner', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # Drop indexes and columns from finding table
    op.drop_index('ix_finding_sla_status', table_name='finding')
    op.drop_index('ix_finding_remediation_deadline', table_name='finding')
    op.drop_index('ix_finding_jira_issue_key', table_name='finding')
    op.drop_index('ix_finding_review_status', table_name='finding')
    
    op.drop_column('finding', 'remediation_owner')
    op.drop_column('finding', 'sla_status')
    op.drop_column('finding', 'remediation_deadline')
    op.drop_column('finding', 'jira_status')
    op.drop_column('finding', 'jira_issue_key')
    op.drop_column('finding', 'review_status')
