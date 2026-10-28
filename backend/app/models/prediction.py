import uuid
from datetime import datetime
from sqlalchemy import Boolean, Float, Integer, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, get_utc_now


class PrefetchTelemetry(Base):
    __tablename__ = "prefetch_telemetry"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE", name="fk_prefetch_telemetry_user_id"),
        nullable=False,
        index=True,
    )
    predicted_file_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("files.id", ondelete="CASCADE", name="fk_prefetch_telemetry_predicted_file_id"),
        nullable=False,
        index=True,
    )
    actual_file_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("files.id", ondelete="SET NULL", name="fk_prefetch_telemetry_actual_file_id"),
        nullable=True,
        index=True,
    )
    is_hit: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
        index=True,
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        server_default=text("0.0"),
        nullable=False,
    )
    time_saved_ms: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default=text("0"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=get_utc_now,
        server_default=text("now()"),
        nullable=False,
        index=True,
    )

    # Relationships
    user = relationship("User", backref="prefetch_telemetry")
    predicted_file = relationship("FileRecord", foreign_keys=[predicted_file_id])
    actual_file = relationship("FileRecord", foreign_keys=[actual_file_id])

    def __repr__(self) -> str:
        return f"<PrefetchTelemetry id={self.id} user_id={self.user_id} is_hit={self.is_hit} confidence={self.confidence}>"
