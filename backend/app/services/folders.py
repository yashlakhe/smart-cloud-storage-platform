import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.folder import Folder
from app.models.file import FileRecord
from app.services.storage import storage_service


class FolderNotFoundError(Exception):
    """Raised when a folder does not exist or user does not own it."""


class InvalidFolderError(Exception):
    """Raised when folder hierarchy or name is invalid."""


def create_folder(
    db: Session,
    user_id: uuid.UUID,
    name: str,
    parent_folder_id: uuid.UUID | None = None,
) -> Folder:
    """Create a new folder owned by user."""
    clean_name = name.strip()
    if not clean_name:
        raise InvalidFolderError("Folder name cannot be empty")

    if parent_folder_id is not None:
        # Verify parent folder belongs to user
        parent_result = db.execute(
            select(Folder).where(
                Folder.id == parent_folder_id,
                Folder.owner_id == user_id,
            )
        )
        parent = parent_result.scalar_one_or_none()
        if parent is None:
            raise FolderNotFoundError("Parent folder not found")

    folder = Folder(
        owner_id=user_id,
        parent_folder_id=parent_folder_id,
        name=clean_name,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


def list_folders(
    db: Session,
    user_id: uuid.UUID,
    parent_folder_id: uuid.UUID | None = None,
    all_folders: bool = False,
) -> list[Folder]:
    """List folders owned by user."""
    stmt = select(Folder).where(Folder.owner_id == user_id)
    if not all_folders:
        stmt = stmt.where(Folder.parent_folder_id == parent_folder_id)
    stmt = stmt.order_by(Folder.name.asc())
    result = db.execute(stmt)
    return list(result.scalars().all())


def get_folder(
    db: Session,
    user_id: uuid.UUID,
    folder_id: uuid.UUID,
) -> Folder:
    """Retrieve folder by ID, checking ownership."""
    result = db.execute(
        select(Folder).where(
            Folder.id == folder_id,
            Folder.owner_id == user_id,
        )
    )
    folder = result.scalar_one_or_none()
    if folder is None:
        raise FolderNotFoundError("Folder not found")
    return folder


def rename_folder(
    db: Session,
    user_id: uuid.UUID,
    folder_id: uuid.UUID,
    new_name: str,
) -> Folder:
    """Rename an existing folder."""
    folder = get_folder(db, user_id, folder_id)
    clean_name = new_name.strip()
    if not clean_name:
        raise InvalidFolderError("Folder name cannot be empty")
    folder.name = clean_name
    db.commit()
    db.refresh(folder)
    return folder


def delete_folder(
    db: Session,
    user_id: uuid.UUID,
    folder_id: uuid.UUID,
) -> None:
    """Delete a folder and clean up associated files in storage."""
    folder = get_folder(db, user_id, folder_id)

    # Clean up any file objects stored in this folder
    files_result = db.execute(
        select(FileRecord).where(FileRecord.folder_id == folder_id)
    )
    files = files_result.scalars().all()
    for file_record in files:
        storage_service.delete_file_object(file_record.storage_key)

    db.delete(folder)
    db.commit()
