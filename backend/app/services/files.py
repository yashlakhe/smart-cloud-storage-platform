import hashlib
import os
import re
import uuid
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.config import settings
from app.models.base import get_utc_now
from app.models.file import FileRecord
from app.models.folder import Folder
from app.models.share import FileShare
from app.services.activity import log_activity
from app.services.folders import get_folder, FolderNotFoundError
from app.services.shares import get_user_file_permission
from app.services.storage import storage_service



class FileNotFoundError(Exception):
    """Raised when a file is not found or user lacks authorization."""


class FileOperationError(Exception):
    """Raised when a file operation is invalid or violates constraints."""


class AccessDeniedError(Exception):
    """Raised when user is unauthorized to perform the file action."""


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and shell injection."""
    # Extract basename to strip any directories
    base = os.path.basename(filename).strip()
    # Remove null bytes and non-printable characters
    clean = re.sub(r'[\x00-\x1f\x7f]', '', base)
    # Replace dangerous characters with underscore
    clean = re.sub(r'[/\\?%*:|"<>~]', '_', clean)
    if not clean or clean == '.' or clean == '..':
        clean = "unnamed_file"
    return clean[:255]


def upload_file(
    db: Session,
    user_id: uuid.UUID,
    file_bytes: bytes,
    original_filename: str,
    mime_type: str = "application/octet-stream",
    folder_id: uuid.UUID | None = None,
) -> FileRecord:
    """Validate, store object, and persist file metadata."""
    size = len(file_bytes)
    if size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise FileOperationError(
            f"File size ({size} bytes) exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_BYTES} bytes"
        )

    clean_filename = sanitize_filename(original_filename)

    # Validate folder if specified
    if folder_id is not None:
        try:
            get_folder(db, user_id, folder_id)
        except FolderNotFoundError as exc:
            raise FileOperationError("Target folder not found") from exc

    # Compute SHA-256 hash
    content_hash = hashlib.sha256(file_bytes).hexdigest()

    file_id = uuid.uuid4()
    # Predictable, non-sensitive object key per Architecture.md
    storage_key = f"users/{user_id}/files/{file_id}/{clean_filename}"

    # 1. Store in object storage
    storage_service.upload_file_bytes(
        storage_key=storage_key,
        data=file_bytes,
        content_type=mime_type,
    )

    # 2. Persist in database
    file_record = FileRecord(
        id=file_id,
        owner_id=user_id,
        folder_id=folder_id,
        original_filename=clean_filename,
        storage_key=storage_key,
        mime_type=mime_type or "application/octet-stream",
        size=size,
        content_hash=content_hash,
    )

    db.add(file_record)
    try:
        db.commit()
        db.refresh(file_record)
    except Exception as exc:
        db.rollback()
        # Clean up storage object on DB failure
        storage_service.delete_file_object(storage_key)
        raise FileOperationError(f"Database error saving file metadata: {exc}") from exc

    # Log upload event
    log_activity(
        db=db,
        user_id=user_id,
        action="UPLOAD",
        resource_type="file",
        resource_id=file_record.id,
        resource_name=file_record.original_filename,
        details=f"Uploaded {file_record.original_filename} ({file_record.size} bytes)",
    )

    return file_record



def list_files(
    db: Session,
    user_id: uuid.UUID,
    folder_id: uuid.UUID | None = None,
    search_query: str | None = None,
) -> list[FileRecord]:
    """List files owned by user, optionally filtered by folder or search."""
    stmt = select(FileRecord).where(FileRecord.owner_id == user_id)

    if search_query and search_query.strip():
        term = f"%{search_query.strip()}%"
        stmt = stmt.where(FileRecord.original_filename.ilike(term))
    elif folder_id is not None:
        stmt = stmt.where(FileRecord.folder_id == folder_id)
    else:
        stmt = stmt.where(FileRecord.folder_id.is_(None))

    stmt = stmt.order_by(FileRecord.created_at.desc())
    result = db.execute(stmt)
    return list(result.scalars().all())


def get_file(
    db: Session,
    user_id: uuid.UUID,
    file_id: uuid.UUID,
) -> FileRecord:
    """Retrieve file record, validating access authorization."""
    perm = get_user_file_permission(db, user_id, file_id)
    if not perm:
        raise FileNotFoundError("File not found or access denied")

    result = db.execute(
        select(FileRecord).where(FileRecord.id == file_id)
    )
    file_record = result.scalar_one_or_none()
    if file_record is None:
        raise FileNotFoundError("File not found")
    return file_record


def get_download_data(
    db: Session,
    user_id: uuid.UUID,
    file_id: uuid.UUID,
) -> tuple[FileRecord, str | None, bytes | None]:
    """
    Authorize download and return file metadata along with presigned S3 URL or direct bytes.
    Updates last_accessed_at timestamp.
    """
    file_record = get_file(db, user_id, file_id)

    # Update last_accessed_at
    file_record.last_accessed_at = get_utc_now()
    db.commit()

    presigned_url = storage_service.generate_presigned_download_url(
        storage_key=file_record.storage_key,
        filename=file_record.original_filename,
    )

    if presigned_url:
        log_activity(
            db=db,
            user_id=user_id,
            action="DOWNLOAD",
            resource_type="file",
            resource_id=file_record.id,
            resource_name=file_record.original_filename,
            details=f"Downloaded via S3 presigned URL ({file_record.size} bytes)",
        )
        return file_record, presigned_url, None

    # Fallback to local byte stream
    file_bytes = storage_service.get_file_bytes(file_record.storage_key)
    log_activity(
        db=db,
        user_id=user_id,
        action="DOWNLOAD",
        resource_type="file",
        resource_id=file_record.id,
        resource_name=file_record.original_filename,
        details=f"Streamed file contents ({file_record.size} bytes)",
    )
    return file_record, None, file_bytes


def rename_file(
    db: Session,
    user_id: uuid.UUID,
    file_id: uuid.UUID,
    new_name: str,
) -> FileRecord:
    """Rename a file (owner only)."""
    clean_name = sanitize_filename(new_name)
    if not clean_name:
        raise FileOperationError("Filename cannot be empty")

    result = db.execute(
        select(FileRecord).where(
            FileRecord.id == file_id,
            FileRecord.owner_id == user_id,
        )
    )
    file_record = result.scalar_one_or_none()
    if file_record is None:
        raise FileNotFoundError("File not found or not owned by user")

    old_name = file_record.original_filename
    file_record.original_filename = clean_name
    db.commit()
    db.refresh(file_record)

    log_activity(
        db=db,
        user_id=user_id,
        action="RENAME",
        resource_type="file",
        resource_id=file_record.id,
        resource_name=clean_name,
        details=f"Renamed file from '{old_name}' to '{clean_name}'",
    )

    return file_record


def move_file(
    db: Session,
    user_id: uuid.UUID,
    file_id: uuid.UUID,
    new_folder_id: uuid.UUID | None,
) -> FileRecord:
    """Move a file to a new folder (owner only)."""
    target_folder_name = "Root"
    if new_folder_id is not None:
        folder = get_folder(db, user_id, new_folder_id)
        target_folder_name = folder.name

    result = db.execute(
        select(FileRecord).where(
            FileRecord.id == file_id,
            FileRecord.owner_id == user_id,
        )
    )
    file_record = result.scalar_one_or_none()
    if file_record is None:
        raise FileNotFoundError("File not found or not owned by user")

    file_record.folder_id = new_folder_id
    db.commit()
    db.refresh(file_record)

    log_activity(
        db=db,
        user_id=user_id,
        action="MOVE",
        resource_type="file",
        resource_id=file_record.id,
        resource_name=file_record.original_filename,
        details=f"Moved file to '{target_folder_name}'",
    )

    return file_record


def delete_file(
    db: Session,
    user_id: uuid.UUID,
    file_id: uuid.UUID,
) -> None:
    """Delete a file object and database metadata (owner only)."""
    result = db.execute(
        select(FileRecord).where(
            FileRecord.id == file_id,
            FileRecord.owner_id == user_id,
        )
    )
    file_record = result.scalar_one_or_none()
    if file_record is None:
        raise FileNotFoundError("File not found or not owned by user")

    filename_snapshot = file_record.original_filename
    size_snapshot = file_record.size

    # 1. Delete object from storage
    storage_service.delete_file_object(file_record.storage_key)

    # 2. Delete database record
    db.delete(file_record)
    db.commit()

    log_activity(
        db=db,
        user_id=user_id,
        action="DELETE",
        resource_type="file",
        resource_id=file_id,
        resource_name=filename_snapshot,
        details=f"Permanently deleted file ({size_snapshot} bytes)",
    )



def get_storage_stats(
    db: Session,
    user_id: uuid.UUID,
) -> dict:
    """Calculate total files, folders, total bytes used, and mime distribution."""
    files_result = db.execute(
        select(FileRecord).where(FileRecord.owner_id == user_id)
    )
    files = files_result.scalars().all()

    folders_count_res = db.execute(
        select(func.count(Folder.id)).where(Folder.owner_id == user_id)
    )
    folder_count = folders_count_res.scalar() or 0

    total_bytes = sum(f.size for f in files)
    file_count = len(files)

    # Breakdown by category
    categories = {
        "images": 0,
        "documents": 0,
        "media": 0,
        "archives": 0,
        "code": 0,
        "other": 0,
    }

    for f in files:
        mt = (f.mime_type or "").lower()
        if mt.startswith("image/"):
            categories["images"] += f.size
        elif mt.startswith("video/") or mt.startswith("audio/"):
            categories["media"] += f.size
        elif "pdf" in mt or "word" in mt or "text/" in mt or "document" in mt or "sheet" in mt or "presentation" in mt:
            categories["documents"] += f.size
        elif "zip" in mt or "tar" in mt or "gzip" in mt or "rar" in mt or "7z" in mt:
            categories["archives"] += f.size
        elif "json" in mt or "javascript" in mt or "python" in mt or "xml" in mt:
            categories["code"] += f.size
        else:
            categories["other"] += f.size

    return {
        "total_files": file_count,
        "total_folders": folder_count,
        "total_bytes_used": total_bytes,
        "categories": categories,
    }
