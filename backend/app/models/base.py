from datetime import datetime, timezone
from sqlalchemy.orm import DeclarativeBase


def get_utc_now() -> datetime:
    """Return current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy models."""
    pass
