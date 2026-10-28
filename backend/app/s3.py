import time
import logging
import boto3
from botocore.exceptions import ClientError, BotoCoreError, NoCredentialsError
from app.config import settings

logger = logging.getLogger("smartcloudstorage.s3")

_LAST_CHECK_TIME: float = 0.0
_CACHED_STATUS: str | None = None
_CACHE_TTL_SECONDS: float = 30.0


def check_s3_connection(force_refresh: bool = False) -> str:
    """
    Safely verifies S3 bucket accessibility without exposing credentials or crashing.
    Results are cached for 30 seconds to prevent unnecessary cross-region network latency.
    """
    global _LAST_CHECK_TIME, _CACHED_STATUS
    now = time.time()
    if not force_refresh and _CACHED_STATUS is not None and (now - _LAST_CHECK_TIME) < _CACHE_TTL_SECONDS:
        return _CACHED_STATUS

    if not settings.S3_BUCKET_NAME or not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        logger.info("S3 health check: AWS S3 configuration is incomplete (unconfigured).")
        _LAST_CHECK_TIME = now
        _CACHED_STATUS = "unconfigured"
        return "unconfigured"

    try:
        s3_client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        _LAST_CHECK_TIME = now
        _CACHED_STATUS = "connected"
        return "connected"
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code", "Unknown")
        if error_code == "404" or error_code == "NoSuchBucket":
            logger.warning("S3 Diagnostic: Bucket not found.")
        elif error_code in ("403", "AccessDenied"):
            logger.warning("S3 Diagnostic: Access denied to bucket.")
        elif error_code == "InvalidAccessKeyId":
            logger.warning("S3 Diagnostic: Invalid access key ID.")
        elif error_code == "SignatureDoesNotMatch":
            logger.warning("S3 Diagnostic: Invalid secret access key.")
        else:
            logger.warning(f"S3 Diagnostic: AWS ClientError ({error_code}).")
        _LAST_CHECK_TIME = now
        _CACHED_STATUS = "error"
        return "error"
    except NoCredentialsError:
        logger.warning("S3 Diagnostic: Missing or invalid AWS credentials.")
        _LAST_CHECK_TIME = now
        _CACHED_STATUS = "error"
        return "error"
    except (BotoCoreError, Exception) as exc:
        logger.warning(f"S3 Diagnostic: Network/connection error ({type(exc).__name__}).")
        _LAST_CHECK_TIME = now
        _CACHED_STATUS = "error"
        return "error"
