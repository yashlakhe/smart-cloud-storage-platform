from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.analytics import get_dashboard_analytics

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    status_code=status.HTTP_200_OK,
)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardSummaryResponse:
    """Retrieve storage capacity, breakdown, access aging, and recent activity for dashboard."""
    data = get_dashboard_analytics(db=db, user_id=current_user.id)
    return DashboardSummaryResponse.model_validate(data)
