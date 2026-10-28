from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "Smart Cloud Storage Platform"
    APP_VERSION: str = "0.2.0"
    PHASE: str = "Enterprise Engine Active"

    # Database Configuration (Host default fallback)
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/smartcloudstorage"

    # AWS S3 Configuration
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    S3_BUCKET_NAME: str | None = None

    # CORS Configuration
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Authentication Configuration
    JWT_SECRET: str = "smart-cloud-storage-super-secure-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # File Storage Constraints & Quota
    DEFAULT_STORAGE_QUOTA_BYTES: int = 10 * 1024 * 1024 * 1024  # 10 GB
    MAX_UPLOAD_SIZE_BYTES: int = 100 * 1024 * 1024  # 100 MB
    LOCAL_STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage_data")

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

