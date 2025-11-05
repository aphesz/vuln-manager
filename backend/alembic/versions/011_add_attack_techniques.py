"""add_attack_techniques_to_templates

Revision ID: 011_add_attack_techniques
Revises: 010_add_tags_system
Create Date: 2025-11-05 08:56:16.724944

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '011_add_attack_techniques'
down_revision = '010_add_tags_system'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add attack_techniques column as JSON (stored as text in PostgreSQL)
    op.add_column(
        'vulnerability_templates',
        sa.Column('attack_techniques', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    # Remove attack_techniques column
    op.drop_column('vulnerability_templates', 'attack_techniques')
