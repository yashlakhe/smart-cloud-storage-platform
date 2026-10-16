import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, get_utc_now


class FileShare(Base):
    __tablename__ = "file_shares"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("files.id", ondelete="CASCADE", name="fk_file_shares_file_id"),
        nullable=False,
        index=True,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE", name="fk_file_shares_owner_id"),
        nullable=False,
        index=True,
    )
    shared_with_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE", name="fk_file_shares_shared_with_user_id"),
        nullable=False,
        index=True,
    )
    permission: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="read",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=get_utc_now,
        server_default=text("now()"),
        nullable=False,
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    # Relationships
    file = relationship("FileRecord", back_populates="shares", passive_deletes=True)
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_shares")
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id], backref="received_shares")

    def __repr__(self) -> str:

        return f"<FileShare id={self.id} file_id={self.file_id} shared_with={self.shared_with_user_id} perm={self.permission}>"
