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

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Smart Cloud Storage Platform REST API — Phase 2, 3, & 4",
)

# Configure CORS restricted to frontend development origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(folders_router)
app.include_router(files_router)
app.include_router(shares_router)


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
