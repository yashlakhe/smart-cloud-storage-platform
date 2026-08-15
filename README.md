# Smart Cloud Storage Platform

A cloud-native file storage platform designed to provide secure, scalable file management with cloud object storage, metadata management, access control, sharing, storage analytics, and an extensible intelligent storage optimization layer.

> **Current Phase:** Phase 1 — Development Infrastructure (VERIFIED COMPLETE)

---

## Overview

The Smart Cloud Storage Platform is built around a clear separation of concerns:
- **Application metadata** stored in PostgreSQL.
- **Actual file objects** stored in Amazon S3.
- **REST API, business logic, and security** provided by FastAPI (Python).
- **User interface** provided by React + TypeScript (Vite + Tailwind CSS v3).

Phase 1 establishes a clean, reproducible development infrastructure connecting React → FastAPI → PostgreSQL and FastAPI → Amazon S3 using Docker Compose.

---

## Local Development Setup

### Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: 20 or higher (with `npm`)
- **Docker & Docker Compose** (for containerized setup)

### Environment Configuration

Copy `.env.example` to create your local `.env` file:

```bash
cp .env.example .env
```

Default local environment variables:
```env
# Host local development database URL
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/smartcloudstorage

# AWS S3 Configuration (Optional for initial startup)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=

# CORS Origin Configuration
FRONTEND_ORIGIN=http://localhost:5173

# Frontend API Endpoint
VITE_API_URL=http://localhost:8000
```

---

## Running Locally (Host Mode)

### 1. Backend Setup (FastAPI)

```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend server will run at `http://localhost:8000`.

### 2. Frontend Setup (React + TypeScript)

```bash
cd frontend
npm install
npm run dev
```

The frontend application will run at `http://localhost:5173`.

---

## Running with Docker Compose

To spin up all services (PostgreSQL, FastAPI Backend, React Frontend) in containerized mode:

```bash
docker compose up --build
```

### Docker Network Architecture
- **`db`**: PostgreSQL 15 container (`postgres:15-alpine`) with health check (`pg_isready`).
- **`backend`**: FastAPI backend container connecting to database at `db:5432`.
- **`frontend`**: React Vite container binding to `0.0.0.0:5173` for host access.

---

## Application URLs & Endpoints

| Resource | URL | Purpose |
| :--- | :--- | :--- |
| **Frontend Application** | `http://localhost:5173` | React application shell displaying real-time infrastructure connection status |
| **Backend API Root** | `http://localhost:8000/` | Application identifier & phase metadata |
| **Health Check API** | `http://localhost:8000/health` | Service status diagnostic endpoint (Backend, Database, S3) |
| **Interactive API Docs** | `http://localhost:8000/docs` | Swagger UI OpenAPI documentation |

---

## Health Check API Specification

`GET /health` **always returns HTTP 200 OK** whenever the backend process is running. Downstream service status is reported dynamically in the JSON body:

### Healthy Status (All services connected)
```json
{
  "status": "healthy",
  "services": {
    "backend": "running",
    "database": "connected",
    "s3": "connected"
  }
}
```

### Degraded Status (Dependency unconfigured or unreachable)
```json
{
  "status": "degraded",
  "services": {
    "backend": "running",
    "database": "disconnected",
    "s3": "unconfigured"
  }
}
```

- **Resilience Guarantee**: Missing AWS S3 credentials or PostgreSQL connectivity timeouts will **NOT crash** the FastAPI application process.
- **Privacy & Security**: AWS credentials, secret keys, and database passwords are never exposed in API responses, logs, or UI output.

---

## Current Development Roadmap

- [x] **Phase 1 — Development Infrastructure**
  - [x] FastAPI backend (`GET /`, `GET /health`, `/docs`)
  - [x] React + TypeScript + Tailwind CSS v3 frontend shell
  - [x] React → FastAPI REST communication
  - [x] PostgreSQL connection health check (`SELECT 1`)
  - [x] Amazon S3 safe diagnostic connection check (`head_bucket`)
  - [x] Docker Compose multi-service definition
- [ ] **Phase 2 — Authentication and Users** (Pending explicit review and authorization)
