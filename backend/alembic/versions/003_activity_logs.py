"""create activity_logs table

Revision ID: 003_activity_logs
Revises: 002_storage_shares
Create Date: 2026-09-01 18:30:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_activity_logs'
down_revision: Union[str, Sequence[str], None] = '002_storage_shares'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'activity_logs',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('resource_type', sa.String(length=32), nullable=False),
        sa.Column('resource_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('resource_name', sa.String(length=255), nullable=True),
        sa.Column('details', sa.String(length=1024), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name='pk_activity_logs'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_activity_logs_user_id', ondelete='CASCADE'),
    )
    op.create_index('ix_activity_logs_user_id', 'activity_logs', ['user_id'])
    op.create_index('ix_activity_logs_action', 'activity_logs', ['action'])
    op.create_index('ix_activity_logs_resource_type', 'activity_logs', ['resource_type'])
    op.create_index('ix_activity_logs_resource_id', 'activity_logs', ['resource_id'])
    op.create_index('ix_activity_logs_created_at', 'activity_logs', ['created_at'])


def downgrade() -> None:
    op.drop_table('activity_logs')
