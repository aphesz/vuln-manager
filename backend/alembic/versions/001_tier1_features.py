"""Add peer review, Jira integration, and SLA tracking

Revision ID: 001_tier1_features
Revises: 
Create Date: 2025-11-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_tier1_features'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create new enum types
    reviewstatus_enum = postgresql.ENUM('Pending', 'In Review', 'Approved', 'Rejected', 
                                         name='reviewstatus', create_type=True)
    reviewstatus_enum.create(op.get_bind(), checkfirst=True)
    
    slastatus_enum = postgresql.ENUM('On Track', 'At Risk', 'Overdue', 
                                     name='slastatus', create_type=True)
    slastatus_enum.create(op.get_bind(), checkfirst=True)
    
    # Add new columns to finding table
    op.add_column('finding', sa.Column('review_status', postgresql.ENUM('Pending', 'In Review', 'Approved', 'Rejected', 
                                                                         name='reviewstatus', create_type=False), 
                                      server_default='Pending', nullable=False))
    op.add_column('finding', sa.Column('jira_issue_key', sa.String(length=255), nullable=True))
    op.add_column('finding', sa.Column('jira_status', sa.String(length=255), nullable=True))
    op.add_column('finding', sa.Column('remediation_deadline', sa.DateTime(), nullable=True))
    op.add_column('finding', sa.Column('sla_status', postgresql.ENUM('On Track', 'At Risk', 'Overdue', 
                                                                      name='slastatus', create_type=False), 
                                      nullable=True))
    op.add_column('finding', sa.Column('remediation_owner', sa.String(length=255), nullable=True))
    
    # Create indexes for new columns
    op.create_index('ix_finding_review_status', 'finding', ['review_status'])
    op.create_index('ix_finding_jira_issue_key', 'finding', ['jira_issue_key'])
    op.create_index('ix_finding_remediation_deadline', 'finding', ['remediation_deadline'])
    op.create_index('ix_finding_sla_status', 'finding', ['sla_status'])
    
    # Create comment table
    op.create_table('comment',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('text', sa.String(length=5000), nullable=False),
        sa.Column('user', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('finding_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['finding_id'], ['finding.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_comment_finding_id', 'comment', ['finding_id'])
    
    # Create auditlog table
    op.create_table('auditlog',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('user', sa.String(length=255), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('changes_json', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_auditlog_entity_type', 'auditlog', ['entity_type'])
    op.create_index('ix_auditlog_entity_id', 'auditlog', ['entity_id'])
    op.create_index('ix_auditlog_action', 'auditlog', ['action'])
    op.create_index('ix_auditlog_timestamp', 'auditlog', ['timestamp'])
    
    # Create jirasettings table
    op.create_table('jirasettings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jira_url', sa.String(length=500), nullable=False),
        sa.Column('project_key', sa.String(length=50), nullable=False),
        sa.Column('api_token_encrypted', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('project_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['project_id'], ['project.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_jirasettings_project_id', 'jirasettings', ['project_id'])


def downgrade() -> None:
    # Drop tables
    op.drop_index('ix_jirasettings_project_id', table_name='jirasettings')
    op.drop_table('jirasettings')
    
    op.drop_index('ix_auditlog_timestamp', table_name='auditlog')
    op.drop_index('ix_auditlog_action', table_name='auditlog')
    op.drop_index('ix_auditlog_entity_id', table_name='auditlog')
    op.drop_index('ix_auditlog_entity_type', table_name='auditlog')
    op.drop_table('auditlog')
    
    op.drop_index('ix_comment_finding_id', table_name='comment')
    op.drop_table('comment')
    
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
    
    # Drop enum types
    sa.Enum(name='slastatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='reviewstatus').drop(op.get_bind(), checkfirst=True)
