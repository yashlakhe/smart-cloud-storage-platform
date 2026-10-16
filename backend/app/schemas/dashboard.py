from pydantic import BaseModel, ConfigDict
from app.schemas.activity import ActivityLogResponse


class StorageQuotaStats(BaseModel):
    total_quota_bytes: int
    total_bytes_used: int
    remaining_bytes: int
    percent_used: float


class CategoryDetail(BaseModel):
    bytes: int
    count: int
    percent_of_used: float


class AccessAgingCategory(BaseModel):
    key: str
    label: str
    description: str
    bytes: int
    count: int
    percent_of_used: float


class DashboardSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    quota: StorageQuotaStats
    total_files: int
    total_folders: int
    total_shares_given: int
    total_shares_received: int
    categories: dict[str, CategoryDetail]
    access_aging: list[AccessAgingCategory]
    recent_activities: list[ActivityLogResponse]
