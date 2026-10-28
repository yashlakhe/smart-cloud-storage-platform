import uuid
from datetime import datetime
from sqlalchemy import String, BigInteger, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, get_utc_now


class FileRecord(Base):
    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE", name="fk_files_owner_id"),
        nullable=False,
        index=True,
    )
    folder_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("folders.id", ondelete="SET NULL", name="fk_files_folder_id"),
        nullable=True,
        index=True,
    )
    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    storage_key: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        index=True,
    )
    mime_type: Mapped[str] = mapped_column(
        String(127),
        nullable=False,
        default="application/octet-stream",
    )
    size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    content_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=get_utc_now,
        server_default=text("now()"),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=get_utc_now,
        server_default=text("now()"),
        onupdate=get_utc_now,
        nullable=False,
    )
    last_accessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    storage_tier: Mapped[str] = mapped_column(
        String(32),
        default="STANDARD",
        server_default=text("'STANDARD'"),
        nullable=False,
        index=True,
    )
    tier_transitioned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=get_utc_now,
        server_default=text("now()"),
        nullable=False,
    )
    access_count: Mapped[int] = mapped_column(
        BigInteger,
        default=0,
        server_default=text("0"),
        nullable=False,
    )
    storage_object_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("storage_objects.id", ondelete="SET NULL", name="fk_files_storage_object_id"),
        nullable=True,
        index=True,
    )

    # Relationships
    owner = relationship("User", backref="files")
    folder = relationship("Folder", backref="files")
    shares = relationship("FileShare", back_populates="file", cascade="all, delete-orphan", passive_deletes=True)
    storage_object = relationship("StorageObject", back_populates="files")

    def __repr__(self) -> str:
        return f"<FileRecord id={self.id} filename={self.original_filename} size={self.size}>"

