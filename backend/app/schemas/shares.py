from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.schemas.auth import UserResponse
from app.schemas.files import FileResponse


class ShareCreate(BaseModel):
    file_id: UUID
    recipient_email: EmailStr
    permission: str = Field(default="read", pattern="^(read|write)$")


class ShareResponse(BaseModel):
    id: UUID
    file_id: UUID
    owner_id: UUID
    shared_with_user_id: UUID
    permission: str
    created_at: datetime
    revoked_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class SharedWithMeItem(BaseModel):
    share_id: UUID
    permission: str
    created_at: datetime
    file: FileResponse
    owner: UserResponse
