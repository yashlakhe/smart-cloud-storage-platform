"""create folders files shares tables

Revision ID: 002_storage_shares
Revises: 001_create_users_table
Create Date: 2026-09-01 12:00:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_storage_shares'
down_revision: Union[str, Sequence[str], None] = '001_create_users_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create folders table
    op.create_table(
        'folders',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('owner_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('parent_folder_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name='pk_folders'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name='fk_folders_owner_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_folder_id'], ['folders.id'], name='fk_folders_parent_folder_id', ondelete='CASCADE'),
    )
    op.create_index('ix_folders_owner_id', 'folders', ['owner_id'])
    op.create_index('ix_folders_parent_folder_id', 'folders', ['parent_folder_id'])

    # 2. Create files table
    op.create_table(
        'files',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('owner_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('folder_id', sa.UUID(as_uuid=True), nullable=True),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('storage_key', sa.String(length=512), nullable=False),
        sa.Column('mime_type', sa.String(length=127), nullable=False),
        sa.Column('size', sa.BigInteger(), nullable=False),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_accessed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name='pk_files'),
        sa.UniqueConstraint('storage_key', name='uq_files_storage_key'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name='fk_files_owner_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['folder_id'], ['folders.id'], name='fk_files_folder_id', ondelete='SET NULL'),
    )
    op.create_index('ix_files_owner_id', 'files', ['owner_id'])
    op.create_index('ix_files_folder_id', 'files', ['folder_id'])
    op.create_index('ix_files_content_hash', 'files', ['content_hash'])
    op.create_index('ix_files_storage_key', 'files', ['storage_key'])

    # 3. Create file_shares table
    op.create_table(
        'file_shares',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('file_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('owner_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('shared_with_user_id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('permission', sa.String(length=20), server_default='read', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name='pk_file_shares'),
        sa.ForeignKeyConstraint(['file_id'], ['files.id'], name='fk_file_shares_file_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name='fk_file_shares_owner_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shared_with_user_id'], ['users.id'], name='fk_file_shares_shared_with_user_id', ondelete='CASCADE'),
    )
    op.create_index('ix_file_shares_file_id', 'file_shares', ['file_id'])
    op.create_index('ix_file_shares_owner_id', 'file_shares', ['owner_id'])
    op.create_index('ix_file_shares_shared_with_user_id', 'file_shares', ['shared_with_user_id'])
    op.create_index('ix_file_shares_revoked_at', 'file_shares', ['revoked_at'])


def downgrade() -> None:
    op.drop_table('file_shares')
    op.drop_table('files')
    op.drop_table('folders')
