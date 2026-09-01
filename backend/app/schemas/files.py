from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class FileUpdate(BaseModel):
    original_filename: str | None = Field(default=None, min_length=1, max_length=255)
    folder_id: UUID | None = None


class FileResponse(BaseModel):
    id: UUID
    owner_id: UUID
    folder_id: UUID | None = None
    original_filename: str
    storage_key: str
    mime_type: str
    size: int
    content_hash: str
    created_at: datetime
    updated_at: datetime
    last_accessed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class FileDownloadResponse(BaseModel):
    file_id: UUID
    filename: str
    mime_type: str
    size: int
    download_url: str | None = None
    direct_stream_available: bool = True


class StorageCategoryBreakdown(BaseModel):
    images: int = 0
    documents: int = 0
    media: int = 0
    archives: int = 0
    code: int = 0
    other: int = 0


class StorageStatsResponse(BaseModel):
    total_files: int
    total_folders: int
    total_bytes_used: int
    categories: StorageCategoryBreakdown
