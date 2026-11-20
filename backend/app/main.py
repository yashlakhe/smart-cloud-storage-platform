import logging
import os
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.core.deps import get_current_user
from app.db import check_db_connection
from app.models.user import User
from app.s3 import check_s3_connection
from app.schemas.auth import UserResponse
from app.api.auth import router as auth_router
from app.api.folders import router as folders_router
from app.api.files import router as files_router
from app.api.shares import router as shares_router
from app.api.activity import router as activity_router
from app.api.dashboard import router as dashboard_router
from app.api.tiering import router as tiering_router
from app.api.prediction import router as prediction_router
from app.api.dedup import router as dedup_router
from app.api.compression import router as compression_router

logger = logging.getLogger("smartcloudstorage.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database migrations are automatically applied on startup if connected
    if check_db_connection() == "connected":
        try:
            from alembic.config import Config
            from alembic import command
            ini_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "alembic.ini")
            if os.path.exists(ini_path):
                alembic_cfg = Config(ini_path)
                command.upgrade(alembic_cfg, "head")
                logger.info("Alembic migrations verified: database schema up to date.")
        except Exception as exc:
            logger.warning(f"Alembic auto-migration check note: {exc}")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise Cloud Storage Platform REST API with Autonomous Storage Optimization, Content-Addressable Deduplication, and Access Prediction",
    lifespan=lifespan,
)

# Configure CORS supporting development and production Vercel origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.render\.com|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(folders_router)
app.include_router(files_router)
app.include_router(shares_router)
app.include_router(activity_router)
app.include_router(dashboard_router)
app.include_router(tiering_router)
app.include_router(prediction_router)
app.include_router(dedup_router)
app.include_router(compression_router)



@app.get("/users/me", response_model=UserResponse, tags=["Users"])
def get_user_profile(current_user: User = Depends(get_current_user)) -> UserResponse:
    """User profile endpoint alias for /auth/me per Architecture.md."""
    return UserResponse.model_validate(current_user)


@app.get("/")
def read_root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "phase": settings.PHASE,
    }


@app.get("/health")
def health_check():
    db_status = check_db_connection()
    s3_status = check_s3_connection()

    if db_status == "connected" and s3_status == "connected":
        overall_status = "healthy"
    else:
        overall_status = "degraded"

    return {
        "status": overall_status,
        "services": {
            "backend": "running",
            "database": db_status,
            "s3": s3_status,
        },
    }
