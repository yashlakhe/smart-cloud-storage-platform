# Smart Cloud Storage Platform

A cloud-native file storage platform designed to provide secure,
scalable file management with cloud object storage, metadata management,
access control, sharing, storage analytics, and an extensible
intelligent storage optimization layer.

> **Project status:** In active development

------------------------------------------------------------------------

## Overview

The Smart Cloud Storage Platform is a full-stack cloud application that
allows users to securely store, organize, access, download, and share
files through a web interface.

The project is designed around a clear separation between:

-   **Application metadata** stored in PostgreSQL.
-   **Actual file objects** stored in Amazon S3.
-   **Business logic and security** handled by a FastAPI backend.
-   **User interaction** handled by a React + TypeScript frontend.

The initial goal is to build a reliable cloud-storage MVP. Once the core
platform is stable, an intelligent storage layer will be introduced to
investigate areas such as usage-aware storage optimization,
deduplication, predictive access analysis, and cost-aware storage
decisions.

------------------------------------------------------------------------

## Key Features

### Core Storage

-   Secure user registration and authentication.
-   File upload to cloud object storage.
-   File listing and metadata.
-   File download.
-   File deletion.
-   Folder-based organization.
-   File search.
-   File sharing.
-   Access-control enforcement.

### Storage Management

-   Storage capacity tracking.
-   Used and available storage.
-   File count and type distribution.
-   Recent activity.
-   File access logging.

### Planned Intelligent Layer

The architecture is designed to support future intelligent storage
capabilities such as:

-   Usage-aware storage tiering.
-   Duplicate detection.
-   Access-pattern analysis.
-   Cost-aware storage recommendations.
-   Adaptive compression.
-   Predictive file-access analysis.
-   Self-optimizing storage policies.

These capabilities are intentionally excluded from the initial MVP and
will be evaluated after the core platform is stable.

------------------------------------------------------------------------

## Architecture

``` text
                         Internet
                            |
                            v
                  +-------------------+
                  |  React Frontend   |
                  | TypeScript + UI   |
                  +---------+---------+
                            |
                         HTTPS
                            |
                            v
                  +-------------------+
                  |   FastAPI Backend |
                  |   REST API        |
                  +---------+---------+
                            |
                 +----------+----------+
                 |                     |
                 v                     v
        +----------------+    +----------------+
        |   PostgreSQL   |    |   Amazon S3    |
        |                |    |                |
        | Users          |    | Actual Files   |
        | File Metadata  |    | Objects        |
        | Folders        |    |                |
        | Permissions    |    |                |
        | Access Logs    |    |                |
        +----------------+    +----------------+
                 |
                 v
        +--------------------+
        | Future Smart Layer |
        |                    |
        | Analytics          |
        | Deduplication      |
        | Tiering            |
        | Prediction         |
        | Optimization       |
        +--------------------+
```

### Storage Model

The platform intentionally separates file content from file metadata.

``` text
PostgreSQL
    |
    +-- User
    +-- File metadata
    +-- Folder
    +-- Sharing permissions
    +-- Activity logs

Amazon S3
    |
    +-- Actual file objects
```

This separation allows the application layer and object-storage layer to
scale independently and provides a foundation for future storage
optimization.

------------------------------------------------------------------------

## Technology Stack

  -----------------------------------------------------------------------
  Layer                   Technology              Purpose
  ----------------------- ----------------------- -----------------------
  Frontend                React                   User interface

  Frontend Language       TypeScript              Type-safe frontend
                                                  development

  Styling                 Tailwind CSS            UI styling

  Backend                 FastAPI                 REST API and business
                                                  logic

  Backend Language        Python                  Application and future
                                                  intelligence layer

  Validation              Pydantic                Request/response
                                                  validation

  ORM                     SQLAlchemy              Database access

  Database                PostgreSQL              Metadata and relational
                                                  data

  Object Storage          Amazon S3               Cloud file storage

  Authentication          JWT + secure password   User authentication
                          hashing                 

  Containerization        Docker                  Reproducible
                                                  environments

  Orchestration           Docker Compose          Local multi-service
                                                  development

  Version Control         Git + GitHub            Source control

  Cloud Platform          AWS                     Cloud infrastructure

  Monitoring              CloudWatch / equivalent Operational monitoring
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## Core Workflow

### File Upload

``` text
User
 |
 | Select file
 v
React Frontend
 |
 | Upload request
 v
FastAPI
 |
 +--> Authenticate user
 |
 +--> Validate request
 |
 +--> Generate storage key
 |
 +--> Upload file -----------------> Amazon S3
 |
 +--> Store metadata -------------> PostgreSQL
 |
 v
Upload successful
```

### File Download

The preferred architecture uses short-lived presigned object-storage
URLs where appropriate:

``` text
User
 |
 v
React
 |
 v
FastAPI
 |
 +--> Authenticate
 +--> Authorize
 +--> Locate file metadata
 +--> Generate temporary S3 URL
 |
 v
React
 |
 v
Amazon S3
 |
 v
File download
```

This avoids unnecessarily routing large file transfers through the
application server.

------------------------------------------------------------------------

## Security

Security is treated as a core architectural concern.

The platform is designed to include:

-   Secure password hashing.
-   JWT-based authentication.
-   Backend-enforced authorization.
-   Ownership-based file access.
-   Controlled file sharing.
-   Private cloud objects.
-   Short-lived presigned download URLs.
-   Environment-based secrets.
-   Input and upload validation.
-   Protection against unauthorized file access.

The frontend is never treated as a security boundary. Authorization
decisions are made by the backend.

------------------------------------------------------------------------

## Project Structure

The public repository will evolve toward the following structure:

``` text
smart-cloud-storage-platform/
│
├── backend/
│   ├── app/
│   └── tests/
│
├── frontend/
│   └── src/
│
├── README.md
├── .gitignore
└── docker-compose.yml
```

Internal AI development documents are intentionally kept outside the
public repository.

------------------------------------------------------------------------

## Development Roadmap

### Phase 1 --- Infrastructure

-   [ ] Initialize React frontend.
-   [ ] Initialize FastAPI backend.
-   [ ] Configure PostgreSQL.
-   [ ] Configure Docker Compose.
-   [ ] Configure Amazon S3.
-   [ ] Establish service connectivity.

### Phase 2 --- Authentication

-   [ ] User registration.
-   [ ] Secure password hashing.
-   [ ] Login.
-   [ ] JWT authentication.
-   [ ] Protected API routes.
-   [ ] Frontend authentication flow.

### Phase 3 --- Core Storage

-   [ ] File metadata schema.
-   [ ] S3 object-key strategy.
-   [ ] File upload.
-   [ ] File listing.
-   [ ] File metadata.
-   [ ] File download.
-   [ ] File deletion.
-   [ ] Failure handling.

### Phase 4 --- File Management

-   [ ] Folders.
-   [ ] File navigation.
-   [ ] Search.
-   [ ] File sharing.
-   [ ] Permissions.
-   [ ] Share revocation.

### Phase 5 --- Analytics

-   [ ] Storage usage.
-   [ ] File statistics.
-   [ ] Storage visualization.
-   [ ] Activity logging.
-   [ ] Recent activity.

### Phase 6 --- Deployment and Hardening

-   [ ] Automated tests.
-   [ ] Security testing.
-   [ ] Error handling.
-   [ ] Production configuration.
-   [ ] AWS deployment.
-   [ ] Monitoring.
-   [ ] End-to-end validation.

### Phase 7 --- Intelligent Storage Layer

Potential research directions:

-   [ ] Duplicate detection.
-   [ ] Access-pattern analysis.
-   [ ] Intelligent storage tiering.
-   [ ] Cost-aware recommendations.
-   [ ] Adaptive compression.
-   [ ] Predictive storage optimization.

The final novelty direction will be selected after the MVP is
operational.

------------------------------------------------------------------------

## Local Development

The project is being developed around a containerized local environment.

Expected services:

``` text
Frontend
   |
Backend
   |
PostgreSQL
   |
Amazon S3
```

### Prerequisites

The development environment will require:

-   Git
-   Python
-   Node.js
-   Docker
-   Docker Compose
-   AWS account/access to S3

### Environment Configuration

Secrets and environment-specific configuration should be stored outside
source control.

Example variables:

``` text
DATABASE_URL=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
JWT_SECRET=
```

Do not commit real credentials.

A sanitized `.env.example` will be added to the repository during
infrastructure setup.

------------------------------------------------------------------------

## API

The backend will expose REST APIs grouped approximately as:

``` text
/auth
/users
/files
/folders
/shares
/storage
/activity
```

Interactive API documentation will be available through FastAPI/OpenAPI
during development.

The exact API contract will evolve as implementation progresses.

------------------------------------------------------------------------

## Engineering Principles

The project follows several engineering principles:

1.  **Cloud storage is separate from metadata storage.**
2.  **Security decisions are enforced server-side.**
3.  **The MVP is a modular monolith rather than premature
    microservices.**
4.  **Large file transfers should use object-storage capabilities
    efficiently.**
5.  **Infrastructure complexity must have a clear purpose.**
6.  **Features are implemented incrementally and tested before
    expansion.**
7.  **Future intelligence must solve a measurable storage problem rather
    than exist only as an AI feature.**

------------------------------------------------------------------------

## Project Goals

This project aims to demonstrate practical understanding of:

-   Cloud computing.
-   Object storage.
-   REST API architecture.
-   Full-stack application development.
-   Database design.
-   Authentication and authorization.
-   Cloud resource management.
-   Containerization.
-   Cloud deployment.
-   Storage analytics.
-   Intelligent resource optimization.

The long-term goal is to evolve the platform from a conventional
cloud-storage application into a **self-optimizing storage system**
while maintaining a clean and measurable architecture.

------------------------------------------------------------------------


