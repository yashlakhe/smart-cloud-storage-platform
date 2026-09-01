import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.files import FileResponse
from app.schemas.shares import ShareCreate, ShareResponse, SharedWithMeItem
from app.services.shares import (
    InvalidShareError,
    ShareNotFoundError,
    list_file_shares,
    list_shared_with_me,
    revoke_share,
    share_file,
)

router = APIRouter(prefix="/shares", tags=["Sharing"])


@router.post(
    "/",
    response_model=ShareResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_share(
    payload: ShareCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ShareResponse:
    """Share a file with another registered user by email."""
    try:
        share = share_file(
            db=db,
            owner_id=current_user.id,
            file_id=payload.file_id,
            recipient_email=payload.recipient_email,
            permission=payload.permission,
        )
    except InvalidShareError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return ShareResponse.model_validate(share)


@router.get(
    "/shared-with-me",
    response_model=list[SharedWithMeItem],
    status_code=status.HTTP_200_OK,
)
def get_shared_with_me_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SharedWithMeItem]:
    """List all files shared with the current user."""
    shares = list_shared_with_me(db=db, user_id=current_user.id)
    items = []
    for s in shares:
        items.append(
            SharedWithMeItem(
                share_id=s.id,
                permission=s.permission,
                created_at=s.created_at,
                file=FileResponse.model_validate(s.file),
                owner=UserResponse.model_validate(s.owner),
            )
        )
    return items


@router.get(
    "/file/{file_id}",
    response_model=list[ShareResponse],
    status_code=status.HTTP_200_OK,
)
def get_file_active_shares(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ShareResponse]:
    """List active shares for an owned file."""
    try:
        shares = list_file_shares(
            db=db,
            owner_id=current_user.id,
            file_id=file_id,
        )
    except InvalidShareError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return [ShareResponse.model_validate(s) for s in shares]


@router.delete(
    "/{share_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def revoke_existing_share(
    share_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Revoke access to a shared file."""
    try:
        revoke_share(
            db=db,
            owner_id=current_user.id,
            share_id=share_id,
        )
    except ShareNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share record not found or access denied",
        ) from exc
