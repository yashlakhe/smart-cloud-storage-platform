from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import check_db_connection
from app.s3 import check_s3_connection

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Smart Cloud Storage Platform REST API",
)

# Configure CORS restricted to frontend development origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


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
