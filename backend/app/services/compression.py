import gzip
import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.file import FileRecord
from app.models.storage_object import StorageObject
from app.services.activity import log_activity
from app.services.storage import storage_service

# Eligible compressible MIME patterns
COMPRESSIBLE_MIME_PATTERNS = [
    "text/",
    "application/json",
    "application/xml",
    "application/javascript",
    "application/x-javascript",
    "application/pdf",
    "application/x-yaml",
    "text/csv",
    "text/markdown",
    "text/plain",
    "application/sql",
    "application/ld+json",
]


def is_mime_compressible(mime_type: str | None) -> bool:
    """Check if file MIME type is eligible for adaptive lossless compression."""
    if not mime_type:
        return False
    mt = mime_type.lower()
    return any(pattern in mt for pattern in COMPRESSIBLE_MIME_PATTERNS)


def decompress_storage_bytes(raw_bytes: bytes, compression_algorithm: str | None) -> bytes:
    """Transparently decompress bytes if stored in a compressed format."""
    if not compression_algorithm or compression_algorithm == "NONE":
        return raw_bytes
    if compression_algorithm == "GZIP":
        try:
            return gzip.decompress(raw_bytes)
        except Exception:
            # Fallback to raw bytes if not valid gzip stream
            return raw_bytes
    return raw_bytes


def compress_storage_object(db: Session, storage_object: StorageObject) -> dict:
    """
    Apply lossless gzip compression to backing storage object.
    Replaces physical bytes in storage and updates compressed_size metadata.
    """
    if storage_object.is_compressed:
        return {
            "status": "already_compressed",
            "original_size": storage_object.size,
            "compressed_size": storage_object.compressed_size or storage_object.size,
            "ratio_percent": storage_object.compression_ratio_percent,
        }

    # Retrieve raw uncompressed bytes
    raw_bytes = storage_service.get_file_bytes(storage_object.storage_key)
    compressed_bytes = gzip.compress(raw_bytes, compresslevel=6)
    compressed_len = len(compressed_bytes)

    # If compression did not reduce size (e.g. high-entropy data), keep uncompressed
    if compressed_len >= storage_object.size:
        return {
            "status": "skipped_no_reduction",
            "original_size": storage_object.size,
            "compressed_size": storage_object.size,
            "ratio_percent": 0.0,
        }

    # Write compressed payload to cloud storage
    storage_service.upload_file_bytes(
        storage_key=storage_object.storage_key,
        data=compressed_bytes,
        content_type="application/gzip",
    )

    storage_object.is_compressed = True
    storage_object.compression_algorithm = "GZIP"
    storage_object.compressed_size = compressed_len
    db.commit()
    db.refresh(storage_object)

    return {
        "status": "compressed",
        "original_size": storage_object.size,
        "compressed_size": compressed_len,
        "bytes_saved": storage_object.size - compressed_len,
        "ratio_percent": storage_object.compression_ratio_percent,
    }


def compress_file(db: Session, user_id: uuid.UUID, file_id: uuid.UUID) -> dict:
    """Compress a specific file owned by user."""
    stmt = select(FileRecord).where(FileRecord.id == file_id, FileRecord.owner_id == user_id)
    file = db.execute(stmt).scalar_one_or_none()
    if not file:
        raise FileNotFoundError(f"File {file_id} not found or access denied")

    if not file.storage_object:
        raise ValueError("File lacks a backing storage object")

    result = compress_storage_object(db, file.storage_object)

    if result["status"] == "compressed":
        log_activity(
            db=db,
            user_id=user_id,
            action="FILE_COMPRESSED",
            resource_type="file",
            resource_id=file.id,
            resource_name=file.original_filename,
            details=f"Adaptive compression: {file.size} -> {result['compressed_size']} bytes ({result['ratio_percent']}% reduction)",
        )

    return result


def bulk_compress_cold_files(db: Session, user_id: uuid.UUID) -> dict:
    """
    Automatically compress all eligible uncompressed files in Cold / Archive tiers for the user.
    """
    stmt = (
        select(FileRecord)
        .where(
            FileRecord.owner_id == user_id,
            FileRecord.storage_tier.in_(["STANDARD_IA", "GLACIER_IR", "DEEP_ARCHIVE"]),
        )
    )
    files = list(db.execute(stmt).scalars().all())

    compressed_count = 0
    total_bytes_saved = 0
    processed_obj_ids = set()

    for f in files:
        if not f.storage_object or f.storage_object.id in processed_obj_ids:
            continue
        if f.storage_object.is_compressed:
            continue
        if not is_mime_compressible(f.mime_type):
            continue

        processed_obj_ids.add(f.storage_object.id)
        res = compress_storage_object(db, f.storage_object)
        if res["status"] == "compressed":
            compressed_count += 1
            total_bytes_saved += res["bytes_saved"]
            log_activity(
                db=db,
                user_id=user_id,
                action="FILE_COMPRESSED",
                resource_type="file",
                resource_id=f.id,
                resource_name=f.original_filename,
                details=f"Automated cold-tier compression: {res['ratio_percent']}% savings",
            )

    return {
        "compressed_files_count": compressed_count,
        "total_bytes_saved": total_bytes_saved,
    }


def get_compression_analytics(db: Session, user_id: uuid.UUID | None = None) -> dict:
    """
    Calculate adaptive compression efficiency, space savings, and candidate metrics.
    """
    files_stmt = select(FileRecord)
    if user_id:
        files_stmt = files_stmt.where(FileRecord.owner_id == user_id)
    files = list(db.execute(files_stmt).scalars().all())

    total_files = len(files)
    compressed_files = 0
    compressible_candidates = 0
    total_uncompressed_bytes = 0
    total_current_bytes = 0

    candidate_items = []
    compressed_items = []

    for f in files:
        obj = f.storage_object
        orig_size = f.size
        total_uncompressed_bytes += orig_size

        if obj and obj.is_compressed:
            compressed_files += 1
            eff_size = obj.compressed_size or orig_size
            total_current_bytes += eff_size
            compressed_items.append({
                "file_id": f.id,
                "original_filename": f.original_filename,
                "mime_type": f.mime_type,
                "original_size": orig_size,
                "compressed_size": eff_size,
                "ratio_percent": obj.compression_ratio_percent,
                "storage_tier": f.storage_tier or "STANDARD",
            })
        else:
            total_current_bytes += orig_size
            if is_mime_compressible(f.mime_type) and orig_size > 512:
                compressible_candidates += 1
                candidate_items.append({
                    "file_id": f.id,
                    "original_filename": f.original_filename,
                    "mime_type": f.mime_type,
                    "size": orig_size,
                    "storage_tier": f.storage_tier or "STANDARD",
                    "estimated_savings_bytes": int(orig_size * 0.65),  # ~65% typical text compression
                })

    net_bytes_saved = max(0, total_uncompressed_bytes - total_current_bytes)
    overall_compression_pct = round((net_bytes_saved / max(1, total_uncompressed_bytes)) * 100, 1) if total_uncompressed_bytes > 0 else 0.0

    return {
        "total_files": total_files,
        "compressed_files_count": compressed_files,
        "compressible_candidates_count": compressible_candidates,
        "total_uncompressed_bytes": total_uncompressed_bytes,
        "total_current_bytes": total_current_bytes,
        "net_bytes_saved": net_bytes_saved,
        "overall_compression_pct": overall_compression_pct,
        "compressed_items": compressed_items[:20],
        "candidates": candidate_items[:20],
    }
