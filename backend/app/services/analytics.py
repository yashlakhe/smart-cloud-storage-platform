import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.file import FileRecord
from app.models.folder import Folder
from app.models.share import FileShare
from app.services.activity import list_activities


def get_dashboard_analytics(
    db: Session,
    user_id: uuid.UUID,
    quota_bytes: int | None = None,
) -> dict:
    """
    Compute comprehensive storage analytics, category distribution, access aging,
    and recent activity events for the dashboard.
    """
    effective_quota = quota_bytes if quota_bytes is not None else settings.DEFAULT_STORAGE_QUOTA_BYTES
    now = datetime.now(timezone.utc)


    # 1. Fetch user's files
    files_res = db.execute(
        select(FileRecord).where(FileRecord.owner_id == user_id)
    )
    files = list(files_res.scalars().all())

    # 2. Count folders
    folder_count_res = db.execute(
        select(func.count(Folder.id)).where(Folder.owner_id == user_id)
    )
    folder_count = folder_count_res.scalar() or 0

    # 3. Count shares
    shares_given_res = db.execute(
        select(func.count(FileShare.id)).where(
            FileShare.owner_id == user_id,
            FileShare.revoked_at.is_(None),
        )
    )
    shares_given_count = shares_given_res.scalar() or 0

    shares_received_res = db.execute(
        select(func.count(FileShare.id)).where(
            FileShare.shared_with_user_id == user_id,
            FileShare.revoked_at.is_(None),
        )
    )
    shares_received_count = shares_received_res.scalar() or 0

    # 4. Storage Quota Calculations
    total_bytes_used = sum(f.size for f in files)
    total_files = len(files)
    remaining_bytes = max(0, effective_quota - total_bytes_used)
    percent_used = round((total_bytes_used / effective_quota) * 100, 2) if effective_quota > 0 else 0.0


    # 5. File Category Breakdown
    cat_data: dict[str, dict] = {
        "documents": {"bytes": 0, "count": 0},
        "images": {"bytes": 0, "count": 0},
        "media": {"bytes": 0, "count": 0},
        "code": {"bytes": 0, "count": 0},
        "archives": {"bytes": 0, "count": 0},
        "other": {"bytes": 0, "count": 0},
    }

    # 6. Access Aging Categories
    aging_data: dict[str, dict] = {
        "hot": {
            "key": "hot",
            "label": "Active Tier (< 7 days)",
            "description": "Frequently accessed files in active workflows",
            "bytes": 0,
            "count": 0,
        },
        "warm": {
            "key": "warm",
            "label": "Warm Tier (7 - 30 days)",
            "description": "Regularly referenced files",
            "bytes": 0,
            "count": 0,
        },
        "cold": {
            "key": "cold",
            "label": "Cold Tier (30 - 90 days)",
            "description": "Infrequently accessed files",
            "bytes": 0,
            "count": 0,
        },
        "dormant": {
            "key": "dormant",
            "label": "Archive Ready (> 90 days)",
            "description": "Dormant or unaccessed files eligible for deep archive",
            "bytes": 0,
            "count": 0,
        },
    }

    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    ninety_days_ago = now - timedelta(days=90)

    for f in files:
        mt = (f.mime_type or "").lower()

        # Category classification
        if mt.startswith("image/"):
            cat = "images"
        elif mt.startswith("video/") or mt.startswith("audio/"):
            cat = "media"
        elif any(term in mt for term in ("pdf", "word", "text/", "document", "sheet", "presentation", "opendocument")):
            cat = "documents"
        elif any(term in mt for term in ("zip", "tar", "gzip", "rar", "7z", "compressed")):
            cat = "archives"
        elif any(term in mt for term in ("json", "javascript", "python", "xml", "html", "css", "typescript", "sql", "yaml", "markdown")):
            cat = "code"
        else:
            cat = "other"

        cat_data[cat]["bytes"] += f.size
        cat_data[cat]["count"] += 1

        # Access aging classification
        # Note: timezone comparison requires tz-aware or fallback
        access_time = f.last_accessed_at
        if access_time is None:
            # If never downloaded/streamed, use created_at
            access_time = f.created_at

        # Ensure tz-aware
        if access_time.tzinfo is None:
            access_time = access_time.replace(tzinfo=timezone.utc)

        if access_time >= seven_days_ago:
            aging_data["hot"]["bytes"] += f.size
            aging_data["hot"]["count"] += 1
        elif access_time >= thirty_days_ago:
            aging_data["warm"]["bytes"] += f.size
            aging_data["warm"]["count"] += 1
        elif access_time >= ninety_days_ago:
            aging_data["cold"]["bytes"] += f.size
            aging_data["cold"]["count"] += 1
        else:
            aging_data["dormant"]["bytes"] += f.size
            aging_data["dormant"]["count"] += 1

    # Compute category percentages of used storage
    categories_res = {}
    for cat_name, val in cat_data.items():
        pct = round((val["bytes"] / total_bytes_used) * 100, 1) if total_bytes_used > 0 else 0.0
        categories_res[cat_name] = {
            "bytes": val["bytes"],
            "count": val["count"],
            "percent_of_used": pct,
        }

    # Compute aging percentages
    access_aging_res = []
    for aging_item in aging_data.values():
        pct = round((aging_item["bytes"] / total_bytes_used) * 100, 1) if total_bytes_used > 0 else 0.0
        access_aging_res.append({
            "key": aging_item["key"],
            "label": aging_item["label"],
            "description": aging_item["description"],
            "bytes": aging_item["bytes"],
            "count": aging_item["count"],
            "percent_of_used": pct,
        })

    # 7. Recent Activities (latest 10 entries)
    recent_logs, _ = list_activities(db=db, user_id=user_id, limit=10, offset=0)

    return {
        "quota": {
            "total_quota_bytes": effective_quota,
            "total_bytes_used": total_bytes_used,
            "remaining_bytes": remaining_bytes,
            "percent_used": percent_used,
        },

        "total_files": total_files,
        "total_folders": folder_count,
        "total_shares_given": shares_given_count,
        "total_shares_received": shares_received_count,
        "categories": categories_res,
        "access_aging": access_aging_res,
        "recent_activities": recent_logs,
    }
