# Smart Cloud Storage Platform — Cloud Deployment Guide

This guide details how to deploy the entire production stack using **Vercel** (Frontend CDN) and **Render** (Backend API & Managed PostgreSQL), backed by **AWS S3** for cloud object storage.

---

## 1. Cloud Architecture Overview

```
                      +-----------------------------+
                      |   Vercel Global Edge CDN    |
                      |   (React 19 + Vite + Tailwind)|
                      |   https://<app>.vercel.app  |
                      +--------------+--------------+
                                     |
                          REST API (HTTPS + JWT)
                                     |
                                     v
                      +-----------------------------+
                      |    Render Web Service       |
                      |    (FastAPI + Python 3.11)  |
                      |    https://<api>.onrender.com|
                      +-------+--------------+------+
                              |              |
                psycopg3 pool |              | boto3 (ap-southeast-2)
                              v              v
               +--------------------+   +-----------------------+
               |  Render PostgreSQL |   |      AWS S3 Bucket    |
               |  (Managed Cloud DB)|   | (smart-cloud-storage- |
               |  Auto-migrated     |   |  cp-831744285850)     |
               +--------------------+   +-----------------------+
```

---

## Step 1: Push Changes to GitHub

Ensure all deployment manifests and backend normalizations are committed and pushed:

```bash
git add .
git commit -m "feat(deploy): add Render blueprint, Vercel SPA manifest, and psycopg3 connection normalizer"
git push origin main
```

---

## Step 2: Deploy Backend & Database on Render (Free Tier)

### Method A: Blueprint Auto-Deploy (Fastest)

1. Go to [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints).
2. Click **New Blueprint Instance**.
3. Connect your GitHub repository (`CC`).
4. Render will automatically read [`render.yaml`](file:///c:/Users/asus/OneDrive/Desktop/CC/render.yaml) and declare two resources:
   - `smart-cloud-storage-db` (PostgreSQL Database)
   - `smart-cloud-storage-backend` (FastAPI Web Service)
5. Fill in the required secret environment variables prompted by Render:
   - `AWS_ACCESS_KEY_ID`: *(Your AWS Access Key ID from your private .env)*
   - `AWS_SECRET_ACCESS_KEY`: *(Your AWS Secret Access Key from your private .env)*
6. Click **Apply**.
7. Render will create the database, apply Alembic migrations automatically, and start FastAPI.
8. Copy your Render Backend URL (e.g. `https://smart-cloud-storage-backend.onrender.com`).

---

### Method B: Manual Web Service + Postgres Setup on Render

If not using Blueprints:
1. **Create PostgreSQL**:
   - In Render, click **New +** $\rightarrow$ **PostgreSQL**.
   - Name: `smart-cloud-storage-db`
   - Region: `Singapore` (or closest to India / S3 region)
   - Click **Create Database**.
   - Copy the **Internal Database URL**.
2. **Create Web Service**:
   - Click **New +** $\rightarrow$ **Web Service**.
   - Connect your GitHub repo.
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2"`
   - Add Environment Variables:
     - `DATABASE_URL`: *(Paste Render database internal connection string)*
     - `FRONTEND_ORIGIN`: `https://*.vercel.app`
     - `JWT_SECRET`: *(Click Generate or paste a 64-character random string)*
     - `AWS_REGION`: `ap-southeast-2`
     - `AWS_ACCESS_KEY_ID`: *(Your AWS Access Key ID from your private .env)*
     - `AWS_SECRET_ACCESS_KEY`: *(Your AWS Secret Access Key from your private .env)*
     - `S3_BUCKET_NAME`: `smart-cloud-storage-cp-831744285850-ap-southeast-2-an`
   - Click **Create Web Service**.

---

## Step 3: Deploy Frontend on Vercel (Free Tier)

1. Go to [vercel.com/new](https://vercel.com/new).
2. Sign in with GitHub and select your repository (`CC`).
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select `frontend`.
4. Add Environment Variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://<your-render-backend-url>.onrender.com` *(from Step 2, without trailing slash)*
5. Click **Deploy**.
6. Vercel will build and assign a global production URL (e.g., `https://smart-cloud-storage.vercel.app`).

> **Note on Routing**: The file [`frontend/vercel.json`](file:///c:/Users/asus/OneDrive/Desktop/CC/frontend/vercel.json) is already included to ensure client-side SPA routing works seamlessly on all URLs.

---

## Step 4: Verification Checklist

1. **Verify Backend Health**:
   Visit `https://<your-backend>.onrender.com/health` in your browser.
   It should return:
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
2. **Verify Interactive Docs**:
   Visit `https://<your-backend>.onrender.com/docs` to see Swagger UI.
3. **Verify Frontend**:
   Open your Vercel URL:
   - Register a user.
   - Upload a test file (validates SHA-256 CAS hash & S3 upload).
   - Check **Storage Intelligence** tab for tiering and compression analytics.
