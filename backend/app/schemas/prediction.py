import uuid
from pydantic import BaseModel, Field


class PrefetchedFileItem(BaseModel):
    file_id: uuid.UUID
    original_filename: str
    mime_type: str
    size: int
    storage_tier: str
    confidence: float
    reason: str
    prefetch_url: str | None = None
    stream_url: str


class PredictionRecommendationResponse(BaseModel):
    recommended_files: list[PrefetchedFileItem]
    total_recommended: int
    model_version: str = "MarkovSpatial-v1.0"


class PrefetchTelemetryMetrics(BaseModel):
    total_predictions: int
    total_hits: int
    total_misses: int
    hit_rate_percentage: float
    total_time_saved_ms: int
    estimated_seconds_saved: float


class SequenceTransitionInsight(BaseModel):
    source_filename: str
    target_filename: str
    transition_count: int
    probability: float


class PredictionEvaluationResponse(BaseModel):
    total_evaluated_events: int
    precision_at_1: float
    precision_at_3: float
    recall_at_3: float
    transition_insights: list[SequenceTransitionInsight]
    metrics: PrefetchTelemetryMetrics
