import uuid
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.models.base import get_utc_now
from app.models.file import FileRecord
from app.models.share import FileShare
from app.models.user import User
from app.services.activity import log_activity
from app.services.auth import normalize_email


class ShareNotFoundError(Exception):
    """Raised when a share record is not found or not owned."""


class InvalidShareError(Exception):
    """Raised when sharing request parameters are invalid."""


def share_file(
    db: Session,
    owner_id: uuid.UUID,
    file_id: uuid.UUID,
    recipient_email: str,
    permission: str = "read",
) -> FileShare:
    """Share an owned file with another registered user by email."""
    # 1. Verify file exists and belongs to owner
    file_result = db.execute(
        select(FileRecord).where(
            FileRecord.id == file_id,
            FileRecord.owner_id == owner_id,
        )
    )
    file_record = file_result.scalar_one_or_none()
    if file_record is None:
        raise InvalidShareError("File not found or access denied")

    # 2. Find recipient user
    norm_email = normalize_email(recipient_email)
    recipient_result = db.execute(
        select(User).where(User.email == norm_email)
    )
    recipient = recipient_result.scalar_one_or_none()
    if recipient is None:
        raise InvalidShareError(f"No user found with email '{recipient_email}'")

    if recipient.id == owner_id:
        raise InvalidShareError("You cannot share a file with yourself")

    clean_perm = permission.lower().strip()
    if clean_perm not in ("read", "write"):
        clean_perm = "read"

    # 3. Check for existing share record
    existing_share_result = db.execute(
        select(FileShare).where(
            FileShare.file_id == file_id,
            FileShare.shared_with_user_id == recipient.id,
        )
    )
    existing_share = existing_share_result.scalar_one_or_none()

    if existing_share is not None:
        existing_share.permission = clean_perm
        existing_share.revoked_at = None
        db.commit()
        db.refresh(existing_share)

        log_activity(
            db=db,
            user_id=owner_id,
            action="SHARE",
            resource_type="share",
            resource_id=existing_share.id,
            resource_name=file_record.original_filename,
            details=f"Updated share with {recipient.email} ({clean_perm})",
        )

        return existing_share

    # Create new share
    share = FileShare(
        file_id=file_id,
        owner_id=owner_id,
        shared_with_user_id=recipient.id,
        permission=clean_perm,
    )
    db.add(share)
    db.commit()
    db.refresh(share)

    log_activity(
        db=db,
        user_id=owner_id,
        action="SHARE",
        resource_type="share",
        resource_id=share.id,
        resource_name=file_record.original_filename,
        details=f"Shared '{file_record.original_filename}' with {recipient.email} ({clean_perm})",
    )

    return share


def list_shared_with_me(
    db: Session,
    user_id: uuid.UUID,
) -> list[FileShare]:
    """List all active file shares granted to this user."""
    stmt = (
        select(FileShare)
        .join(FileRecord, FileShare.file_id == FileRecord.id)
        .where(
            FileShare.shared_with_user_id == user_id,
            FileShare.revoked_at.is_(None),
        )
        .order_by(FileShare.created_at.desc())
    )
    result = db.execute(stmt)
    return list(result.scalars().all())


def list_file_shares(
    db: Session,
    owner_id: uuid.UUID,
    file_id: uuid.UUID,
) -> list[FileShare]:
    """List all active shares created by the owner for a specific file."""
    # Verify ownership
    file_res = db.execute(
        select(FileRecord).where(
            FileRecord.id == file_id,
            FileRecord.owner_id == owner_id,
        )
    )
    if file_res.scalar_one_or_none() is None:
        raise InvalidShareError("File not found or access denied")

    stmt = (
        select(FileShare)
        .where(
            FileShare.file_id == file_id,
            FileShare.owner_id == owner_id,
            FileShare.revoked_at.is_(None),
        )
        .order_by(FileShare.created_at.desc())
    )
    result = db.execute(stmt)
    return list(result.scalars().all())


def revoke_share(
    db: Session,
    owner_id: uuid.UUID,
    share_id: uuid.UUID,
) -> None:
    """Revoke a previously granted file share."""
    result = db.execute(
        select(FileShare).where(
            FileShare.id == share_id,
            FileShare.owner_id == owner_id,
            FileShare.revoked_at.is_(None),
        )
    )
    share = result.scalar_one_or_none()
    if share is None:
        raise ShareNotFoundError("Share record not found")

    share.revoked_at = get_utc_now()
    db.commit()

    log_activity(
        db=db,
        user_id=owner_id,
        action="REVOKE_SHARE",
        resource_type="share",
        resource_id=share_id,
        details="Revoked file share access",
    )



def get_user_file_permission(
    db: Session,
    user_id: uuid.UUID,
    file_id: uuid.UUID,
) -> str | None:
    """
    Check permission level of a user for a given file.
    Returns 'owner', 'write', 'read', or None.
    """
    file_res = db.execute(
        select(FileRecord).where(FileRecord.id == file_id)
    )
    file_record = file_res.scalar_one_or_none()
    if file_record is None:
        return None

    if file_record.owner_id == user_id:
        return "owner"

    share_res = db.execute(
        select(FileShare).where(
            FileShare.file_id == file_id,
            FileShare.shared_with_user_id == user_id,
            FileShare.revoked_at.is_(None),
        )
    )
    share = share_res.scalar_one_or_none()
    if share is not None:
        return share.permission

    return None
