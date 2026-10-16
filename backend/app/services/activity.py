import logging
import uuid
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.activity import ActivityLog

logger = logging.getLogger(__name__)


def log_activity(
    db: Session,
    user_id: uuid.UUID,
    action: str,
    resource_type: str,
    resource_id: uuid.UUID | None = None,
    resource_name: str | None = None,
    details: str | None = None,
    ip_address: str | None = None,
) -> ActivityLog | None:
    """
    Log an event to the activity_logs table.
    """
    try:
        activity = ActivityLog(
            user_id=user_id,
            action=action.upper(),
            resource_type=resource_type.lower(),
            resource_id=resource_id,
            resource_name=resource_name[:255] if resource_name else None,
            details=details[:1024] if details else None,
            ip_address=ip_address[:45] if ip_address else None,
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)
        return activity
    except Exception as exc:
        logger.error("Failed to write activity log: %s", exc)
        db.rollback()
        return None


def list_activities(
    db: Session,
    user_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
    action: str | None = None,
    resource_type: str | None = None,
) -> tuple[list[ActivityLog], int]:
    """
    Retrieve paginated user activities with optional filtering.
    """
    stmt = select(ActivityLog).where(ActivityLog.user_id == user_id)
    count_stmt = select(func.count(ActivityLog.id)).where(ActivityLog.user_id == user_id)

    if action and action.strip():
        clean_action = action.strip().upper()
        stmt = stmt.where(ActivityLog.action == clean_action)
        count_stmt = count_stmt.where(ActivityLog.action == clean_action)

    if resource_type and resource_type.strip():
        clean_resource = resource_type.strip().lower()
        stmt = stmt.where(ActivityLog.resource_type == clean_resource)
        count_stmt = count_stmt.where(ActivityLog.resource_type == clean_resource)

    total = db.execute(count_stmt).scalar() or 0

    stmt = stmt.order_by(ActivityLog.created_at.desc()).offset(offset).limit(limit)
    items = list(db.execute(stmt).scalars().all())

    return items, total
