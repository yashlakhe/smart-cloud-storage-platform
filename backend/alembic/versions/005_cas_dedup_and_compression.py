"""cas deduplication and adaptive compression

Revision ID: 005_cas_dedup_and_compression
Revises: 004_storage_intelligence
Create Date: 2026-10-28 23:20:00.000000+00:00

"""
from typing import Sequence, Union
import uuid
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_cas_dedup_and_compression'
down_revision: Union[str, Sequence[str], None] = '004_storage_intelligence'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create storage_objects table for physical backing objects (Content-Addressable Storage)
    op.create_table(
        'storage_objects',
        sa.Column('id', sa.UUID(as_uuid=True), nullable=False),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('storage_key', sa.String(length=512), nullable=False),
        sa.Column('size', sa.BigInteger(), nullable=False),
        sa.Column('compressed_size', sa.BigInteger(), nullable=True),
        sa.Column('compression_algorithm', sa.String(length=16), server_default=sa.text("'NONE'"), nullable=False),
        sa.Column('is_compressed', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('reference_count', sa.Integer(), server_default=sa.text('1'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name='pk_storage_objects'),
        sa.UniqueConstraint('content_hash', name='uq_storage_objects_content_hash'),
        sa.UniqueConstraint('storage_key', name='uq_storage_objects_storage_key'),
    )
    op.create_index('ix_storage_objects_content_hash', 'storage_objects', ['content_hash'])
    op.create_index('ix_storage_objects_storage_key', 'storage_objects', ['storage_key'])

    # 2. Add storage_object_id foreign key column to files table
    op.add_column('files', sa.Column('storage_object_id', sa.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_files_storage_object_id',
        'files',
        'storage_objects',
        ['storage_object_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_files_storage_object_id', 'files', ['storage_object_id'])

    # 3. Drop unique constraint on files.storage_key to enable CAS deduplication across instances
    op.drop_constraint('uq_files_storage_key', 'files', type_='unique')

    # 4. Backfill existing files into storage_objects
    conn = op.get_bind()
    existing_files = conn.execute(sa.text("SELECT id, content_hash, storage_key, size FROM files")).fetchall()
    
    hash_to_obj_id = {}
    for row in existing_files:
        f_id, c_hash, s_key, f_size = row[0], row[1], row[2], row[3]
        if c_hash not in hash_to_obj_id:
            obj_id = str(uuid.uuid4())
            conn.execute(
                sa.text(
                    "INSERT INTO storage_objects (id, content_hash, storage_key, size, compression_algorithm, is_compressed, reference_count, created_at) "
                    "VALUES (:id, :content_hash, :storage_key, :size, 'NONE', false, 1, now())"
                ),
                {"id": obj_id, "content_hash": c_hash, "storage_key": s_key, "size": f_size},
            )
            hash_to_obj_id[c_hash] = obj_id
        else:
            obj_id = hash_to_obj_id[c_hash]
            conn.execute(
                sa.text("UPDATE storage_objects SET reference_count = reference_count + 1 WHERE id = :id"),
                {"id": obj_id},
            )

        conn.execute(
            sa.text("UPDATE files SET storage_object_id = :obj_id WHERE id = :file_id"),
            {"obj_id": obj_id, "file_id": f_id},
        )


def downgrade() -> None:
    op.create_unique_constraint('uq_files_storage_key', 'files', ['storage_key'])
    op.drop_constraint('fk_files_storage_object_id', 'files', type_='foreignkey')
    op.drop_index('ix_files_storage_object_id', table_name='files')
    op.drop_column('files', 'storage_object_id')
    op.drop_index('ix_storage_objects_storage_key', table_name='storage_objects')
    op.drop_index('ix_storage_objects_content_hash', table_name='storage_objects')
    op.drop_table('storage_objects')
