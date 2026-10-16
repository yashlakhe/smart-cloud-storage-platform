import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, get_utc_now


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE", name="fk_activity_logs_user_id"),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    resource_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
    )
    resource_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    resource_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    details: Mapped[str | None] = mapped_column(
        String(1024),
        nullable=True,
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=get_utc_now,
        server_default=text("now()"),
        nullable=False,
        index=True,
    )

    # Relationships
    user = relationship("User", backref="activity_logs")

    def __repr__(self) -> str:
        return f"<ActivityLog id={self.id} action={self.action} resource_type={self.resource_type} user_id={self.user_id}>"
