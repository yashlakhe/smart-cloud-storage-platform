import uuid
from pydantic import BaseModel


class DeduplicatedFileItem(BaseModel):
    file_id: uuid.UUID
    original_filename: str
    content_hash: str
    size: int
    reference_count: int
    bandwidth_saved_bytes: int


class DeduplicationAnalyticsResponse(BaseModel):
    total_logical_files: int
    total_logical_bytes: int
    total_physical_objects: int
    total_physical_bytes: int
    total_effective_bytes: int
    bytes_saved_by_dedup: int
    deduplication_ratio: float
    savings_percentage: float
    monthly_cost_saved_usd: float
    deduplicated_files_count: int
    deduplicated_files: list[DeduplicatedFileItem]
