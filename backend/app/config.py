from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "Smart Cloud Storage Platform"
    APP_VERSION: str = "0.1.0"
    PHASE: str = "Phase 2 - Authentication and Users"

    # Database Configuration (Host default fallback)
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/smartcloudstorage"

    # AWS S3 Configuration
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    S3_BUCKET_NAME: str | None = None

    # CORS Configuration
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Authentication Configuration (Phase 2 Foundation)
    JWT_SECRET: str | None = None
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
