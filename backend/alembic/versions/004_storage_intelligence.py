"""storage intelligence: tiering and prefetch telemetry

Revision ID: 004_storage_intelligence
Revises: 003_activity_logs
Create Date: 2026-10-28 22:50:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_storage_intelligence'
down_revision: Union[str, Sequence[str], None] = '003_activity_logs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add storage tiering and access count columns to files table
    op.add_column('files', sa.Column('storage_tier', sa.String(length=32), server_default=sa.text("'STANDARD'"), nullable=False))
    op.add_column('files', sa.Column('tier_transitioned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('files', sa.Column('access_count', sa.BigInteger(), server_default=sa.text('0'), nullable=False))
    op.create_index('ix_files_storage_tier', 'files', ['storage_tier'])

    # 2. Create prefetch_telemetry table for access pattern prediction metrics
    op.create_table(
        'prefetch_telemetry',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('predicted_file_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('actual_file_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('is_hit', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('confidence', sa.Float(), server_default=sa.text('0.0'), nullable=False),
        sa.Column('time_saved_ms', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name='pk_prefetch_telemetry'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_prefetch_telemetry_user_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['predicted_file_id'], ['files.id'], name='fk_prefetch_telemetry_predicted_file_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actual_file_id'], ['files.id'], name='fk_prefetch_telemetry_actual_file_id', ondelete='SET NULL'),
    )
    op.create_index('ix_prefetch_telemetry_user_id', 'prefetch_telemetry', ['user_id'])
    op.create_index('ix_prefetch_telemetry_predicted_file_id', 'prefetch_telemetry', ['predicted_file_id'])
    op.create_index('ix_prefetch_telemetry_actual_file_id', 'prefetch_telemetry', ['actual_file_id'])
    op.create_index('ix_prefetch_telemetry_is_hit', 'prefetch_telemetry', ['is_hit'])
    op.create_index('ix_prefetch_telemetry_created_at', 'prefetch_telemetry', ['created_at'])


def downgrade() -> None:
    op.drop_table('prefetch_telemetry')
    op.drop_index('ix_files_storage_tier', table_name='files')
    op.drop_column('files', 'access_count')
    op.drop_column('files', 'tier_transitioned_at')
    op.drop_column('files', 'storage_tier')
