import io
import urllib.parse
import uuid
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.files import (
    FileDownloadResponse,
    FileResponse,
    FileUpdate,
    StorageStatsResponse,
)
from app.services.files import (
    AccessDeniedError,
    FileNotFoundError,
    FileOperationError,
    delete_file,
    get_download_data,
    get_file,
    get_storage_stats,
    list_files,
    move_file,
    rename_file,
    upload_file,
)

router = APIRouter(prefix="/files", tags=["Files"])


@router.post(
    "/upload",
    response_model=FileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_new_file(
    file: UploadFile = File(...),
    folder_id: uuid.UUID | None = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Upload a file to cloud storage and save metadata in PostgreSQL."""
    contents = await file.read()
    filename = file.filename or "uploaded_file"
    content_type = file.content_type or "application/octet-stream"

    try:
        file_record = upload_file(
            db=db,
            user_id=current_user.id,
            file_bytes=contents,
            original_filename=filename,
            mime_type=content_type,
            folder_id=folder_id,
        )
    except FileOperationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return FileResponse.model_validate(file_record)


@router.get(
    "/",
    response_model=list[FileResponse],
    status_code=status.HTTP_200_OK,
)
def get_user_files(
    folder_id: uuid.UUID | None = None,
    q: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FileResponse]:
    """List files owned by user, or search across all user files."""
    files = list_files(
        db=db,
        user_id=current_user.id,
        folder_id=folder_id,
        search_query=q,
    )
    return [FileResponse.model_validate(f) for f in files]


@router.get(
    "/stats/summary",
    response_model=StorageStatsResponse,
    status_code=status.HTTP_200_OK,
)
def get_user_storage_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StorageStatsResponse:
    """Get storage utilization summary and file category distribution."""
    stats = get_storage_stats(db=db, user_id=current_user.id)
    return StorageStatsResponse.model_validate(stats)


@router.get(
    "/{file_id}",
    response_model=FileResponse,
    status_code=status.HTTP_200_OK,
)
def get_file_metadata(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Get metadata for a specific file."""
    try:
        file_record = get_file(
            db=db,
            user_id=current_user.id,
            file_id=file_id,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or access denied",
        ) from exc

    return FileResponse.model_validate(file_record)


@router.get(
    "/{file_id}/download",
    response_model=FileDownloadResponse,
    status_code=status.HTTP_200_OK,
)
def get_file_download_link(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileDownloadResponse:
    """Get download information / presigned S3 URL."""
    try:
        file_record, presigned_url, _ = get_download_data(
            db=db,
            user_id=current_user.id,
            file_id=file_id,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or access denied",
        ) from exc

    return FileDownloadResponse(
        file_id=file_record.id,
        filename=file_record.original_filename,
        mime_type=file_record.mime_type,
        size=file_record.size,
        download_url=presigned_url,
        direct_stream_available=True,
    )


@router.get(
    "/{file_id}/stream",
    status_code=status.HTTP_200_OK,
)
def stream_file_content(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Directly stream file binary with Content-Disposition attachment."""
    try:
        file_record, _, file_bytes = get_download_data(
            db=db,
            user_id=current_user.id,
            file_id=file_id,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or access denied",
        ) from exc

    safe_filename = urllib.parse.quote(file_record.original_filename)
    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{safe_filename}",
        "Content-Type": file_record.mime_type,
        "Content-Length": str(file_record.size),
    }

    if file_bytes is not None:
        return Response(
            content=file_bytes,
            media_type=file_record.mime_type,
            headers=headers,
        )

    # Fallback to direct read from storage
    from app.services.storage import storage_service
    raw_bytes = storage_service.get_file_bytes(file_record.storage_key)
    if file_record.storage_object and file_record.storage_object.is_compressed:
        from app.services.compression import decompress_storage_bytes
        raw_bytes = decompress_storage_bytes(raw_bytes, file_record.storage_object.compression_algorithm)
    return Response(
        content=raw_bytes,
        media_type=file_record.mime_type,
        headers=headers,
    )


@router.put(
    "/{file_id}",
    response_model=FileResponse,
    status_code=status.HTTP_200_OK,
)
def update_file(
    file_id: uuid.UUID,
    payload: FileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    """Rename or move a file."""
    try:
        if payload.original_filename is not None:
            file_record = rename_file(
                db=db,
                user_id=current_user.id,
                file_id=file_id,
                new_name=payload.original_filename,
            )
        else:
            file_record = get_file(db, current_user.id, file_id)

        if payload.folder_id is not None or "folder_id" in payload.model_fields_set:
            file_record = move_file(
                db=db,
                user_id=current_user.id,
                file_id=file_id,
                new_folder_id=payload.folder_id,
            )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or access denied",
        ) from exc
    except FileOperationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return FileResponse.model_validate(file_record)


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_file(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a file from cloud storage and PostgreSQL."""
    try:
        delete_file(
            db=db,
            user_id=current_user.id,
            file_id=file_id,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or access denied",
        ) from exc
