import io
import logging
import os
from typing import BinaryIO
import boto3
from botocore.exceptions import ClientError, BotoCoreError

from app.config import settings

logger = logging.getLogger("smartcloudstorage.storage")


class StorageService:
    def __init__(self):
        self._s3_client = None
        self._has_s3 = bool(
            settings.S3_BUCKET_NAME
            and settings.AWS_ACCESS_KEY_ID
            and settings.AWS_SECRET_ACCESS_KEY
        )
        if self._has_s3:
            try:
                self._s3_client = boto3.client(
                    "s3",
                    region_name=settings.AWS_REGION,
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                )
            except Exception as exc:
                logger.warning(f"Failed to initialize S3 client: {exc}")
                self._has_s3 = False

        # Ensure local fallback storage directory exists for development
        os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)

    @property
    def is_s3_configured(self) -> bool:
        return self._has_s3 and self._s3_client is not None

    def upload_file_bytes(self, storage_key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
        """Upload raw bytes to S3 or fallback storage."""
        if self.is_s3_configured:
            try:
                self._s3_client.put_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=storage_key,
                    Body=data,
                    ContentType=content_type,
                )
                return
            except (ClientError, BotoCoreError) as exc:
                logger.error(f"S3 put_object error: {exc}")
                raise RuntimeError("Failed to store file object in cloud storage") from exc

        # Fallback to local storage
        local_path = os.path.join(settings.LOCAL_STORAGE_DIR, storage_key.replace("/", os.sep))
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(data)

    def get_file_bytes(self, storage_key: str) -> bytes:
        """Retrieve raw bytes of an object."""
        if self.is_s3_configured:
            try:
                response = self._s3_client.get_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=storage_key,
                )
                return response["Body"].read()
            except (ClientError, BotoCoreError) as exc:
                logger.error(f"S3 get_object error: {exc}")
                raise RuntimeError("Failed to read file object from cloud storage") from exc

        local_path = os.path.join(settings.LOCAL_STORAGE_DIR, storage_key.replace("/", os.sep))
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Storage file not found: {storage_key}")
        with open(local_path, "rb") as f:
            return f.read()

    def generate_presigned_download_url(
        self,
        storage_key: str,
        filename: str,
        expires_in: int = 300,
    ) -> str | None:
        """
        Generate short-lived presigned download URL with Content-Disposition attachment.
        Returns None if S3 is not configured (frontend will use direct stream endpoint).
        """
        if not self.is_s3_configured:
            return None

        try:
            url = self._s3_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": settings.S3_BUCKET_NAME,
                    "Key": storage_key,
                    "ResponseContentDisposition": f'attachment; filename="{filename}"',
                },
                ExpiresIn=expires_in,
            )
            return url
        except Exception as exc:
            logger.warning(f"Could not generate presigned URL: {exc}")
            return None

    def delete_file_object(self, storage_key: str) -> None:
        """Delete an object from S3 or fallback storage."""
        if self.is_s3_configured:
            try:
                self._s3_client.delete_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=storage_key,
                )
                return
            except (ClientError, BotoCoreError) as exc:
                logger.warning(f"Failed to delete S3 object {storage_key}: {exc}")

        local_path = os.path.join(settings.LOCAL_STORAGE_DIR, storage_key.replace("/", os.sep))
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except OSError as exc:
                logger.warning(f"Failed to delete local object file {local_path}: {exc}")


storage_service = StorageService()
