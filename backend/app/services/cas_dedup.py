import uuid
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.file import FileRecord
from app.models.storage_object import StorageObject
from app.services.storage import storage_service


def get_or_create_storage_object(
    db: Session,
    content_hash: str,
    size: int,
    raw_bytes: bytes,
    mime_type: str = "application/octet-stream",
) -> tuple[StorageObject, bool]:
    """
    Content-Addressable Storage (CAS) engine.
    Checks if an identical file content hash exists in the repository.
    If exists: increments reference count and returns existing object (instant zero-byte upload).
    If new: uploads to S3 under content-addressable key 'cas/{prefix}/{hash}' and creates record.
    Returns: (StorageObject, is_new_upload: bool)
    """
    stmt = select(StorageObject).where(StorageObject.content_hash == content_hash)
    existing_obj = db.execute(stmt).scalar_one_or_none()

    if existing_obj is not None:
        # Deduplication hit! Verify physical storage presence (self-healing)
        try:
            if not storage_service.is_s3_configured:
                import os
                from app.config import settings
                local_path = os.path.join(settings.LOCAL_STORAGE_DIR, existing_obj.storage_key.replace("/", os.sep))
                if not os.path.exists(local_path):
                    data_to_write = raw_bytes
                    if existing_obj.is_compressed and existing_obj.compression_algorithm == "GZIP":
                        import gzip
                        data_to_write = gzip.compress(raw_bytes)
                    storage_service.upload_file_bytes(
                        storage_key=existing_obj.storage_key,
                        data=data_to_write,
                        content_type=mime_type,
                    )
        except Exception:
            pass

        # Increment physical reference counter
        existing_obj.reference_count += 1
        db.commit()
        db.refresh(existing_obj)
        return existing_obj, False

    # New unique object: Content-Addressable S3 storage key
    prefix = content_hash[:2]
    storage_key = f"cas/{prefix}/{content_hash}"

    # Write single physical copy to cloud storage
    storage_service.upload_file_bytes(
        storage_key=storage_key,
        data=raw_bytes,
        content_type=mime_type,
    )

    storage_obj = StorageObject(
        id=uuid.uuid4(),
        content_hash=content_hash,
        storage_key=storage_key,
        size=size,
        compressed_size=None,
        compression_algorithm="NONE",
        is_compressed=False,
        reference_count=1,
    )
    db.add(storage_obj)
    db.commit()
    db.refresh(storage_obj)

    return storage_obj, True


def release_storage_object_reference(
    db: Session,
    storage_object_id: uuid.UUID,
) -> bool:
    """
    Decrement reference count when a logical file is deleted.
    Purges physical cloud object only when reference count reaches 0.
    Returns True if physical object was deleted from S3, False if other references remain.
    """
    obj = db.get(StorageObject, storage_object_id)
    if not obj:
        return False

    obj.reference_count -= 1
    if obj.reference_count <= 0:
        # No more references exist anywhere on the platform; purge physical object
        storage_service.delete_file_object(obj.storage_key)
        db.delete(obj)
        db.commit()
        return True
    else:
        db.commit()
        return False


def get_deduplication_analytics(db: Session, user_id: uuid.UUID | None = None) -> dict:
    """
    Calculate global or user-scoped Content-Addressable Storage deduplication efficiency metrics.
    """
    # 1. Total logical files & logical bytes
    files_stmt = select(FileRecord)
    if user_id:
        files_stmt = files_stmt.where(FileRecord.owner_id == user_id)
    files = list(db.execute(files_stmt).scalars().all())

    total_logical_files = len(files)
    total_logical_bytes = sum(f.size for f in files)

    # 2. Total physical storage objects & bytes
    objs_stmt = select(StorageObject)
    objs = list(db.execute(objs_stmt).scalars().all())
    objs_map = {o.id: o for o in objs}

    # Count physical objects referenced by this user (or global)
    if user_id:
        referenced_obj_ids = {f.storage_object_id for f in files if f.storage_object_id}
        relevant_objs = [objs_map[oid] for oid in referenced_obj_ids if oid in objs_map]
    else:
        relevant_objs = objs

    total_physical_objects = len(relevant_objs)
    total_physical_bytes = sum(o.size for o in relevant_objs)

    # Effective compressed physical bytes
    total_effective_bytes = sum(o.effective_bytes for o in relevant_objs)

    bytes_saved_by_dedup = max(0, total_logical_bytes - total_physical_bytes)
    dedup_ratio = round(total_logical_bytes / max(1, total_physical_bytes), 2)
    dedup_savings_pct = round((bytes_saved_by_dedup / max(1, total_logical_bytes)) * 100, 1) if total_logical_bytes > 0 else 0.0

    # Monthly S3 cost saved at Standard rate ($0.023/GB)
    gb_saved = bytes_saved_by_dedup / (1024 ** 3)
    monthly_cost_saved_usd = round(gb_saved * 0.023, 4)

    # Deduplicated files list (reference_count > 1)
    deduped_items = []
    for f in files:
        if f.storage_object and f.storage_object.reference_count > 1:
            deduped_items.append({
                "file_id": f.id,
                "original_filename": f.original_filename,
                "content_hash": f.content_hash,
                "size": f.size,
                "reference_count": f.storage_object.reference_count,
                "bandwidth_saved_bytes": f.size,
            })

    return {
        "total_logical_files": total_logical_files,
        "total_logical_bytes": total_logical_bytes,
        "total_physical_objects": total_physical_objects,
        "total_physical_bytes": total_physical_bytes,
        "total_effective_bytes": total_effective_bytes,
        "bytes_saved_by_dedup": bytes_saved_by_dedup,
        "deduplication_ratio": dedup_ratio,
        "savings_percentage": dedup_savings_pct,
        "monthly_cost_saved_usd": monthly_cost_saved_usd,
        "deduplicated_files_count": len(deduped_items),
        "deduplicated_files": deduped_items[:20],
    }
