import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.tiering import (
    StorageTierAnalysisResponse,
    ApplyTieringRequest,
    ApplyTieringResponse,
    SetSingleTierRequest,
)
from app.services.tiering import (
    get_storage_tier_analysis,
    apply_bulk_tiering,
    transition_file_tier,
)

router = APIRouter(prefix="/tiering", tags=["Storage Intelligence - Tiering"])


@router.get("/analysis", response_model=StorageTierAnalysisResponse)
def get_tiering_analysis_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StorageTierAnalysisResponse:
    """
    Get storage tier breakdown, cost analysis, and automated tiering recommendations.
    """
    return get_storage_tier_analysis(db=db, user_id=current_user.id)


@router.post("/apply", response_model=ApplyTieringResponse)
def apply_tiering_endpoint(
    request: ApplyTieringRequest = ApplyTieringRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApplyTieringResponse:
    """
    Apply recommended storage tier transitions to files owned by the user.
    """
    return apply_bulk_tiering(
        db=db,
        user_id=current_user.id,
        target_file_ids=request.file_ids,
    )


@router.put("/files/{file_id}", status_code=status.HTTP_200_OK)
def set_file_tier_endpoint(
    file_id: uuid.UUID,
    request: SetSingleTierRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually transition a single file to a specific storage tier.
    """
    try:
        updated_file = transition_file_tier(
            db=db,
            user_id=current_user.id,
            file_id=file_id,
            target_tier=request.target_tier,
            reason="User manual adjustment from Storage Intelligence hub",
        )
        return {
            "status": "success",
            "file_id": updated_file.id,
            "storage_tier": updated_file.storage_tier,
            "tier_transitioned_at": updated_file.tier_transitioned_at.isoformat(),
        }
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
