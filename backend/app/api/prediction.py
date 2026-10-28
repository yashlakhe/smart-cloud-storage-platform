from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.prediction import (
    PredictionRecommendationResponse,
    PrefetchTelemetryMetrics,
    PredictionEvaluationResponse,
)
from app.services.prediction import (
    get_predicted_files,
    get_prefetch_metrics,
    evaluate_prediction_model,
)

router = APIRouter(prefix="/prediction", tags=["Storage Intelligence - Prediction"])


@router.get("/recommended", response_model=PredictionRecommendationResponse)
def get_recommended_prefetch_endpoint(
    top_k: int = Query(default=4, ge=1, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PredictionRecommendationResponse:
    """
    Get AI-predicted next files with warmed presigned prefetch URLs for zero-latency retrieval.
    """
    return get_predicted_files(db=db, user_id=current_user.id, top_k=top_k)


@router.get("/metrics", response_model=PrefetchTelemetryMetrics)
def get_prediction_metrics_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PrefetchTelemetryMetrics:
    """
    Get live prefetch telemetry metrics: total predictions, hits, misses, hit rate %, and time saved.
    """
    return get_prefetch_metrics(db=db, user_id=current_user.id)


@router.post("/evaluate", response_model=PredictionEvaluationResponse)
def evaluate_prediction_model_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PredictionEvaluationResponse:
    """
    Execute sequence evaluation over historical activity logs to measure Precision@1, Precision@3, and sequence insights.
    """
    return evaluate_prediction_model(db=db, user_id=current_user.id)
