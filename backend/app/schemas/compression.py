import uuid
from pydantic import BaseModel


class CompressedItem(BaseModel):
    file_id: uuid.UUID
    original_filename: str
    mime_type: str
    original_size: int
    compressed_size: int
    ratio_percent: float
    storage_tier: str


class CompressibleCandidate(BaseModel):
    file_id: uuid.UUID
    original_filename: str
    mime_type: str
    size: int
    storage_tier: str
    estimated_savings_bytes: int


class CompressionAnalyticsResponse(BaseModel):
    total_files: int
    compressed_files_count: int
    compressible_candidates_count: int
    total_uncompressed_bytes: int
    total_current_bytes: int
    net_bytes_saved: int
    overall_compression_pct: float
    compressed_items: list[CompressedItem]
    candidates: list[CompressibleCandidate]


class CompressSingleResponse(BaseModel):
    status: str
    original_size: int
    compressed_size: int
    ratio_percent: float


class BulkCompressResponse(BaseModel):
    compressed_files_count: int
    total_bytes_saved: int
