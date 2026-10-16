import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    action: str
    resource_type: str
    resource_id: uuid.UUID | None = None
    resource_name: str | None = None
    details: str | None = None
    ip_address: str | None = None
    created_at: datetime


class ActivityListResponse(BaseModel):
    items: list[ActivityLogResponse]
    total: int
    limit: int
    offset: int
