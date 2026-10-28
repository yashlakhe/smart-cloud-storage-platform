import uuid
from pydantic import BaseModel, ConfigDict, Field


class FileTierRecommendation(BaseModel):
    file_id: uuid.UUID
    original_filename: str
    size: int
    current_tier: str
    recommended_tier: str
    reason: str
    days_unaccessed: int
    access_count: int
    current_monthly_cost_usd: float
    optimized_monthly_cost_usd: float
    monthly_savings_usd: float


class TierCostBreakdown(BaseModel):
    tier: str
    label: str
    description: str
    file_count: int
    total_bytes: int
    rate_per_gb_mo: float
    monthly_cost_usd: float
    percent_of_storage: float


class StorageTierAnalysisResponse(BaseModel):
    baseline_monthly_cost_usd: float
    current_monthly_cost_usd: float
    optimized_monthly_cost_usd: float
    potential_monthly_savings_usd: float
    savings_percentage: float
    tier_breakdown: list[TierCostBreakdown]
    recommendations: list[FileTierRecommendation]
    pending_recommendations_count: int


class ApplyTieringRequest(BaseModel):
    file_ids: list[uuid.UUID] | None = Field(
        default=None,
        description="Optional list of specific file IDs to transition. If omitted or empty, transitions all files with recommendations.",
    )


class ApplyTieringResponse(BaseModel):
    transitioned_count: int
    monthly_savings_usd: float
    updated_files: list[uuid.UUID]


class SetSingleTierRequest(BaseModel):
    target_tier: str = Field(..., description="Target tier: STANDARD, STANDARD_IA, GLACIER_IR, DEEP_ARCHIVE")
