from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.dedup import DeduplicationAnalyticsResponse
from app.services.cas_dedup import get_deduplication_analytics

router = APIRouter(prefix="/dedup", tags=["Storage Intelligence - Deduplication"])


@router.get("/analytics", response_model=DeduplicationAnalyticsResponse)
def get_dedup_analytics_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DeduplicationAnalyticsResponse:
    """
    Get Content-Addressable Storage (CAS) deduplication metrics, single-instance savings, and deduplicated files.
    """
    data = get_deduplication_analytics(db=db, user_id=current_user.id)
    return DeduplicationAnalyticsResponse.model_validate(data)
