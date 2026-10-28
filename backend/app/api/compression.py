import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db import get_db
from app.models.user import User
from app.schemas.compression import (
    CompressionAnalyticsResponse,
    CompressSingleResponse,
    BulkCompressResponse,
)
from app.services.compression import (
    compress_file,
    bulk_compress_cold_files,
    get_compression_analytics,
)

router = APIRouter(prefix="/compression", tags=["Storage Intelligence - Compression"])


@router.get("/analytics", response_model=CompressionAnalyticsResponse)
def get_compression_analytics_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompressionAnalyticsResponse:
    """
    Get adaptive compression analytics: space saved, compression ratio %, and eligible cold candidate files.
    """
    data = get_compression_analytics(db=db, user_id=current_user.id)
    return CompressionAnalyticsResponse.model_validate(data)


@router.post("/compress/{file_id}", response_model=CompressSingleResponse)
def compress_single_file_endpoint(
    file_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompressSingleResponse:
    """
    Compress a specific file using adaptive lossless gzip compression.
    """
    try:
        result = compress_file(db=db, user_id=current_user.id, file_id=file_id)
        return CompressSingleResponse(
            status=result["status"],
            original_size=result["original_size"],
            compressed_size=result["compressed_size"],
            ratio_percent=result.get("ratio_percent", 0.0),
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/bulk-compress-cold", response_model=BulkCompressResponse)
def bulk_compress_cold_files_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BulkCompressResponse:
    """
    Automatically compress all eligible uncompressed files in Cold / Archive tiers.
    """
    result = bulk_compress_cold_files(db=db, user_id=current_user.id)
    return BulkCompressResponse.model_validate(result)
