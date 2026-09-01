from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    parent_folder_id: UUID | None = None


class FolderUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class FolderResponse(BaseModel):
    id: UUID
    owner_id: UUID
    parent_folder_id: UUID | None = None
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
