import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.folders import FolderCreate, FolderResponse, FolderUpdate
from app.services.folders import (
    FolderNotFoundError,
    InvalidFolderError,
    create_folder,
    delete_folder,
    get_folder,
    list_folders,
    rename_folder,
)

router = APIRouter(prefix="/folders", tags=["Folders"])


@router.post(
    "/",
    response_model=FolderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_folder(
    payload: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FolderResponse:
    """Create a new folder for the current user."""
    try:
        folder = create_folder(
            db=db,
            user_id=current_user.id,
            name=payload.name,
            parent_folder_id=payload.parent_folder_id,
        )
    except (InvalidFolderError, FolderNotFoundError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return FolderResponse.model_validate(folder)


@router.get(
    "/",
    response_model=list[FolderResponse],
    status_code=status.HTTP_200_OK,
)
def get_user_folders(
    parent_folder_id: uuid.UUID | None = None,
    all_folders: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FolderResponse]:
    """List folders owned by the current user."""
    folders = list_folders(
        db=db,
        user_id=current_user.id,
        parent_folder_id=parent_folder_id,
        all_folders=all_folders,
    )
    return [FolderResponse.model_validate(f) for f in folders]


@router.get(
    "/{folder_id}",
    response_model=FolderResponse,
    status_code=status.HTTP_200_OK,
)
def get_folder_by_id(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FolderResponse:
    """Get metadata for a specific folder."""
    try:
        folder = get_folder(
            db=db,
            user_id=current_user.id,
            folder_id=folder_id,
        )
    except FolderNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found",
        ) from exc

    return FolderResponse.model_validate(folder)


@router.put(
    "/{folder_id}",
    response_model=FolderResponse,
    status_code=status.HTTP_200_OK,
)
def update_folder_name(
    folder_id: uuid.UUID,
    payload: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FolderResponse:
    """Rename a folder."""
    try:
        folder = rename_folder(
            db=db,
            user_id=current_user.id,
            folder_id=folder_id,
            new_name=payload.name,
        )
    except FolderNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found",
        ) from exc
    except InvalidFolderError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return FolderResponse.model_validate(folder)


@router.delete(
    "/{folder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_folder(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a folder and all contained files."""
    try:
        delete_folder(
            db=db,
            user_id=current_user.id,
            folder_id=folder_id,
        )
    except FolderNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found",
        ) from exc
