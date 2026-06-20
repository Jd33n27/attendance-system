# Production Deployment Guide

This document describes how to deploy the OALCDA Attendance System to production platforms (Render for Backend, Vercel for Frontend, and Supabase for Database). All services used are on the free tier.

---

## 1. Database Setup (Supabase)

1. Create a free account at [supabase.com](https://supabase.com).
2. Create a new project named `oalcda-attendance`.
3. Open the **SQL Editor** in the Supabase Dashboard.
4. Copy the contents of [schema.sql](file:///home/jd33n27/Desktop/work/fullstack/attendance_project/backend/schema.sql) and execute it to create the required tables (`users`, `daily_qr_codes`, and `attendance_logs`) and indexes.
5. Navigate to **Project Settings** -> **Database**.
6. Copy the connection string under **Connection Pooler** (Transaction mode). It looks like:
   `postgres://postgres.xxxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
   *(Ensure you replace `password` with your actual database password).*

---

## 2. Backend Deployment (Render)

The Go backend is configured for simple deployment on Render using the `render.yaml` blueprint.

1. Push your repository to GitHub.
2. Log in to [render.com](https://render.com) and navigate to **Blueprints**.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` configuration.
5. During setup, configure the following environment variables on Render:
   - `DATABASE_URL`: The Supabase connection string.
   - `ADMIN_TOKEN`: A secure, secret string for authenticating QR generation.
   - `QR_SECRET`: A secret salt value to sign QR hashes.
6. Click **Deploy**. Render will build the Go binary and start the server.
7. Once successfully deployed, copy the Render service URL (e.g., `https://oalcda-attendance-api.onrender.com`).
8. Verify it is running by checking the health endpoint: `https://YOUR_RENDER_URL/health` (should return "OK").

---

## 3. Frontend Deployment (Vercel)

The React Vite frontend deploys seamlessly to Vercel.

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Set the **Framework Preset** to `Vite`.
5. Set the **Root Directory** to `frontend`.
6. Under **Environment Variables**, add:
   - `VITE_API_URL`: The URL of your deployed Render backend (e.g., `https://oalcda-attendance-api.onrender.com`).
7. Click **Deploy**. Vercel will build the frontend and deploy it to a public URL.
