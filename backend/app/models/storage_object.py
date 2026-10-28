import uuid
from datetime import datetime
from sqlalchemy import String, BigInteger, Integer, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, get_utc_now


class StorageObject(Base):
    """
    Physical backing object in Content-Addressable Storage (CAS).
    Enables single-instance storage deduplication across multiple user files
    and adaptive lossless compression for cold assets.
    """
    __tablename__ = "storage_objects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    content_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )
    storage_key: Mapped[str] = mapped_column(
        String(512),
        unique=True,
        nullable=False,
        index=True,
    )
    size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    compressed_size: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )
    compression_algorithm: Mapped[str] = mapped_column(
        String(16),
        default="NONE",
        server_default=text("'NONE'"),
        nullable=False,
    )
    is_compressed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
    )
    reference_count: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default=text("1"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=get_utc_now,
        server_default=text("now()"),
        nullable=False,
    )

    # Relationships
    files = relationship("FileRecord", back_populates="storage_object")

    @property
    def effective_bytes(self) -> int:
        """Return compressed size if compressed, else original size."""
        if self.is_compressed and self.compressed_size is not None:
            return self.compressed_size
        return self.size

    @property
    def compression_ratio_percent(self) -> float:
        """Calculate compression savings percentage."""
        if not self.is_compressed or self.compressed_size is None or self.size == 0:
            return 0.0
        saved = max(0, self.size - self.compressed_size)
        return round((saved / self.size) * 100, 1)

    def __repr__(self) -> str:
        return f"<StorageObject hash={self.content_hash[:8]} ref_count={self.reference_count} compressed={self.is_compressed}>"
