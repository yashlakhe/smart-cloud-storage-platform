import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import settings

logger = logging.getLogger("smartcloudstorage.db")

# Create SQLAlchemy engine using modern psycopg3 dialect (postgresql+psycopg://...)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 3},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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
