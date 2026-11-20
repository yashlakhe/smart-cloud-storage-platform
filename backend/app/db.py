import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings

logger = logging.getLogger("smartcloudstorage.db")

def get_normalized_database_url(raw_url: str) -> str:
    """Ensure database URL uses modern psycopg3 dialect (postgresql+psycopg://)."""
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg://", 1)
    if raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+psycopg://"):
        return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return raw_url


# Create SQLAlchemy engine using modern psycopg3 dialect (postgresql+psycopg://...)
# Optimized with connection pooling, recycling, and fast timeout to avoid blocking
normalized_db_url = get_normalized_database_url(settings.DATABASE_URL)
engine = create_engine(
    normalized_db_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=5,
    pool_recycle=1800,
    connect_args={"connect_timeout": 3},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> str:
    """
    Safely verifies database connectivity by executing SELECT 1.
    Returns 'connected' if successful, 'disconnected' otherwise.
    FastAPI startup will NOT fail if the database is unreachable.
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "connected"
    except Exception as exc:
        logger.warning(f"Database health check failed: {exc}")
        return "disconnected"
