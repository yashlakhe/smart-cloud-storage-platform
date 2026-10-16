from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.activity import ActivityListResponse, ActivityLogResponse
from app.services.activity import list_activities

router = APIRouter(prefix="/activity", tags=["Activity Tracking"])


@router.get(
    "/",
    response_model=ActivityListResponse,
    status_code=status.HTTP_200_OK,
)
def get_user_activity_logs(
    limit: int = Query(default=50, ge=1, le=100, description="Maximum number of logs to return"),
    offset: int = Query(default=0, ge=0, description="Offset for pagination"),
    action: str | None = Query(default=None, description="Filter by action type (e.g. UPLOAD, DOWNLOAD, SHARE, DELETE)"),
    resource_type: str | None = Query(default=None, description="Filter by resource type (file, folder, share)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    """Retrieve paginated activity logs for the current authenticated user."""
    items, total = list_activities(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        action=action,
        resource_type=resource_type,
    )
    return ActivityListResponse(
        items=[ActivityLogResponse.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )
